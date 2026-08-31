# Migration : âges en mois (au lieu d'années)

Renommer `age_min`/`age_max` → `age_min_months`/`age_max_months` sur 3 tables et convertir les valeurs existantes (×12, NULL préservés).

## Contexte
Aujourd'hui les âges sont stockés en **années entières** sur `locations`, `events` et `location_proposals`. On veut pouvoir exprimer un âge en **mois** (ex. 18 mois) pour plus de précision. Aucune contrainte CHECK ni index ne porte sur ces colonnes — le renommage est direct.

Données existantes à convertir :
- `locations` : 115 lignes avec `age_min`, 24 avec `age_max` (269 total)
- `events` : 96 / 62 (182 total)
- `location_proposals` : 14 / 14 (123 total)

## Migration SQL (une seule transaction)

```sql
-- locations
ALTER TABLE public.locations RENAME COLUMN age_min TO age_min_months;
ALTER TABLE public.locations RENAME COLUMN age_max TO age_max_months;
UPDATE public.locations SET age_min_months = age_min_months * 12 WHERE age_min_months IS NOT NULL;
UPDATE public.locations SET age_max_months = age_max_months * 12 WHERE age_max_months IS NOT NULL;

-- events
ALTER TABLE public.events RENAME COLUMN age_min TO age_min_months;
ALTER TABLE public.events RENAME COLUMN age_max TO age_max_months;
UPDATE public.events SET age_min_months = age_min_months * 12 WHERE age_min_months IS NOT NULL;
UPDATE public.events SET age_max_months = age_max_months * 12 WHERE age_max_months IS NOT NULL;

-- location_proposals
ALTER TABLE public.location_proposals RENAME COLUMN age_min TO age_min_months;
ALTER TABLE public.location_proposals RENAME COLUMN age_max TO age_max_months;
UPDATE public.location_proposals SET age_min_months = age_min_months * 12 WHERE age_min_months IS NOT NULL;
UPDATE public.location_proposals SET age_max_months = age_max_months * 12 WHERE age_max_months IS NOT NULL;
```

Aucune autre table n'est touchée. Pas de modification de RLS, de grants, ni de politiques (les noms de colonnes ne figurent dans aucune policy). Le fichier de types `src/integrations/supabase/types.ts` sera régénéré automatiquement après la migration.

## Hors périmètre (géré séparément, ne pas inclure)
- UI, edge functions, types côté web qui référencent `age_min`/`age_max` (`AdminPage.tsx`, `ProposeLocationModal.tsx`, `LocationPage.tsx`, `ageFilter.ts`, `event.ts`).
- Avertissement : tant que le web n'est pas aligné, les requêtes/selects sur `age_min`/`age_max` échoueront (colonnes introuvables). C'est le sujet d'un chantier web distinct.
