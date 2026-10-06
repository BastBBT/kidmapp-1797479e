# Colonne `is_free` sur lieux et sorties

Base de données uniquement, sans aucun changement d'UI web. On ne renomme et on ne supprime rien : `price` reste la source écrite par les apps.

## Ce qui a été vérifié
- Le schéma public ne contient aucune vue. Aucune RPC ne renvoie les events, à part `admin_link_clicks_stats`, qui n'est pas concernée. Les Sorties lisent directement les tables `events` et `event_occurrences` : il n'y a rien d'autre à exposer.
- Aucun droit n'est défini colonne par colonne sur `price`. Une nouvelle colonne hérite donc des mêmes politiques RLS que les tables.

## Migration (une seule)
1. `ADD COLUMN IF NOT EXISTS is_free boolean` sur `locations` et sur `events` : la colonne accepte NULL et n'a pas de valeur par défaut.
2. `public.price_is_free(p text)` en IMMUTABLE, avec `SET search_path = public` :
   - p NULL ou vide après trim : NULL.
   - Soit `t = lower(trim(p))`. La fonction renvoie true si `t` commence par « gratuit », « entrée libre », « entree libre », « accès libre » ou « acces libre », ET si `t` ne contient ni « € » ni chiffre (`!~ '[0-9€]'`) ou contient « visiteur ». Dans tous les autres cas, elle renvoie false.
3. Fonction trigger `sync_is_free_from_price()` : `NEW.is_free := price_is_free(NEW.price)`. Elle est attachée en `BEFORE INSERT OR UPDATE OF price` sur les deux tables.
4. Backfill des deux tables dans la même migration.
5. Commentaires SQL qui documentent le sens des valeurs : true, false ou NULL.

## Vérifications après exécution
- Les 11 cas de référence via `SELECT price_is_free(...)`. Tous doivent correspondre au résultat attendu.
- Régénération des types générés pour que `is_free` y apparaisse.
- Je te renvoie :
  - le nombre de lignes true / false / NULL pour `locations` et pour `events` ;
  - la liste complète (id, price, is_free) des events dont `price` contient « gratuit » ou « libre » mais dont `is_free` est false.
