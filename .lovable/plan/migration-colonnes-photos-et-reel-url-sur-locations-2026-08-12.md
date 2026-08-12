# Migration : colonnes `photos` et `reel_url` sur `locations`

## Objectif
Ajouter deux colonnes optionnelles à la table `public.locations` pour enrichir les fiches lieu :

- `photos text[]` — galerie de photos supplémentaires ordonnées (la colonne `photo` existante reste la couverture principale des cartes).
- `reel_url text` — URL d'un reel Instagram du lieu (au plus une).

## Changement SQL
```sql
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS photos text[],
  ADD COLUMN IF NOT EXISTS reel_url text;
```

## Détails
- **Type** : `text[]` pour `photos` (tableau ordonné d'URLs), `text` pour `reel_url`.
- **Nullabilité** : les deux colonnes sont `NULL` par défaut — aucun backfill, aucun impact sur les lignes existantes.
- **RLS** : aucun changement. Les colonnes sont lisibles selon les mêmes policies que les autres colonnes de `locations` (déjà ouvertes en lecture à `anon`/`authenticated`). Aucune nouvelle policy nécessaire.
- **Triggers** : aucun. `update_updated_at_column` couvre déjà toute mise à jour via `updated_at`.
- **Index** : aucun (pas de requête prévue sur ces colonnes pour l'instant).

## Impact
- Aucune rupture : `SELECT *` existant retourne simplement deux colonnes de plus (toutes NULL).
- Le code frontend/lire n'est pas touché dans ce lot — la mise à jour du schéma est seule concernée.
- Le fichier auto-généré `src/integrations/supabase/types.ts` sera régénéré automatiquement après exécution de la migration.

## Étapes
1. Approuver la migration ci-dessus via l'outil de migration.
2. (Hors périmètre de cette migration) Mise à jour côté UI/admin pour saisir/afficher ces champs — à planifier séparément si souhaité.
