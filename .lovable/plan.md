## Approche

Trois lots avec validation explicite entre chaque. Pour chaque lot je te livrerai : (a) la liste exacte des tokens traités, (b) confirmation qu'ils ont été vérifiés par requête SQL directe sur la vraie table (pas juste typecheck).

## Tokens déjà vérifiés en base (à intégrer/compléter avant lot 1)

Requêtes exécutées ce turn contre les vraies tables :

- **`locations.category`** (10) : `cafe, coiffeur, creatif, culture, jeux, nature, public, restaurant, shop, sport` — déjà couverts dans `fr/en/es.json > category_place`. ✅
- **`events.category`** (7) : `Atelier, Autre, Exposition, Festival, Fête, Marché, Spectacle` — déjà couverts dans `category_event`. ✅
- **`events.weather`** (3) : `En intérieur, En extérieur, Les deux` — déjà couverts dans `weather`. ✅
- **`locations.weather`** (constantes `WEATHERS` dans `src/lib/activity.ts`) : `Soleil, Pluie, Tout temps` — **⚠️ manquants dans les JSON actuels** (le namespace `weather` ne contient que les 3 valeurs event). À ajouter.
- **`locations.duration`** : `1h, 2-3h, Demi-journée, Journée` — déjà couverts. ✅
- **`locations.effort`** : `Tranquille, Modéré, Sportif` — déjà couverts. ✅
- **`events.price`** : `Gratuit, Payant` (+ valeurs libres type "7€" laissées telles quelles via fallback `translateToken`). ✅
- **`meal_types.id`** (5) : `brunch, dejeuner, diner, gouter, petitdej` — **⚠️ namespace `meal` actuel utilise les labels FR ("Petit déjeuner"…) comme clés**, or `MealFilter` reçoit un objet `MealType` avec `id`, `short_label`, `emoji`. À aligner : soit clefs par `id`, soit continuer à afficher `m.short_label` sans traduction (labels stockés en DB FR). Décision plan : garder `short_label` tel quel côté MealFilter (contenu DB, hors scope tokens fermés) — retirer le namespace `meal` inutilisé.

## Lot 1 — Filtres uniquement

**Fichiers** : `CategoryFilter`, `EventCategoryFilter`, `ActivityFilter`, `MealFilter`, `AgeFilter`.

**Tokens/strings à traduire** :

- Labels segment `CategoryFilter` : "Lieux" / "Activités" → nouvelle clé `filters.places` / `filters.activities`.
- Labels catégories via `translateToken('category_place', cat)` et `translateToken('category_event', cat)` — utilise les 10+7 tokens déjà vérifiés.
- Label "Tous" dans `EventCategoryFilter` → `filters.all`.
- `ActivityFilter` : titres "Météo :" / "Durée :" → `filters.weather_label` / `filters.duration_label` ; pills weather via `translateToken('weather', w)` (nécessite ajout `Soleil/Pluie/Tout temps` dans le namespace `weather`) ; pills duration via `translateToken('duration', d)`.
- `AgeFilter` : label "ÂGE" → `filters.age_label` ; les 4 buckets `Tous / 0-2 ans / 3-5 ans / 6+ ans` sont dans `src/lib/ageFilter.ts` — ajouter clés `filters.age.all / 0_2 / 3_5 / 6_plus` et passer par `t()` au rendu (pas de modif de la constante `AGE_BUCKETS` pour ne pas casser le typage `id`).
- `MealFilter` : pas de tokens fermés (les libellés viennent de `meal_types` en DB). Aucune traduction à ajouter.

**Modifs supplémentaires JSON** : compléter `weather` avec `Soleil / Pluie / Tout temps` dans fr/en/es.

**Vérification livrée après le lot** :
- Re-requête `SELECT DISTINCT category FROM locations`, `... FROM events`, `weather FROM locations`, `duration FROM locations` pour reconfirmer que chaque token du lot existe bien en base.
- Table markdown des tokens traités par namespace.
- Screenshot Playwright de la barre de filtres en FR + toggle EN pour vérifier visuellement le rendu.

## Lot 2 — Cards + pages lieux/events

**Fichiers** : `LocationCard`, `LocationPage`, `EventCard`, `EventPage`, `SortiesPage`, `WeekendPicker`, création de `src/lib/formatDate.ts` (`formatEventDate`, `formatRelativeDate` basés sur `i18n.language` via `date-fns/locale` fr/enUS/es).

**Tokens/strings** :
- Catégories lieux/events : `translateToken` (déjà couvert).
- Weather/duration/effort/price sur les cards : `translateToken` sur les namespaces `weather / duration / effort / price`.
- Équipements (chaise haute, table à langer, espace jeux, menu enfant) : `translateToken('equipment', key)` — déjà présent dans les JSON.
- Strings UI figées (ex. "Confirmer les infos", "Terminé", "Voir sur la carte", "Ajouter au calendrier", chips `WeekendPicker` "Semaine dernière / Cette semaine / Semaine du…", sous-titre SortiesPage) → nouvelles clés dans namespaces `location`, `event`, `sorties`.
- Dates : remplacer les `format(..., 'd MMM', { locale: fr })` par helpers localisés.

**Vérification livrée** :
- Re-requête `SELECT DISTINCT weather, duration, effort FROM locations` et `SELECT DISTINCT price, weather FROM events` pour confirmer les tokens.
- Liste exhaustive des strings UI hardcodées migrées.
- Screenshots FR/EN d'une LocationPage et d'une EventPage.

## Lot 3 — Reste

**Fichiers** : `SavedPage`, `AccountPage`, `AuthModal`, `IosAppBanner`.

**Strings** : titres, empty states, boutons, erreurs auth traduites (déjà en FR), CTA App Store. Pas de tokens DB dans ce lot — validation = revue de la liste des clés ajoutées et screenshots FR/EN/ES.

## Détails techniques

- Ordre strict : lot 1 → attends validation → lot 2 → attends validation → lot 3. Aucun fichier hors du lot en cours n'est modifié.
- `translateToken` fait déjà le fallback `defaultValue: token`, donc un token DB non mappé s'affiche brut sans casser — mais on ne s'appuie pas dessus : chaque token est vérifié explicitement par SQL.
- Après chaque lot : `psql` sur les colonnes concernées + `tsgo` pour le typecheck + screenshot Playwright ciblé (pas juste "ça compile").
- Pas de changement d'infra i18n, de `main.tsx`, ni des fichiers déjà migrés dans la première passe.