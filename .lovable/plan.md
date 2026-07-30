## Objectif
Étendre la contrainte `CHECK` sur la colonne `category` des tables `public.locations` et `public.location_proposals` pour accepter la nouvelle valeur `librairie`.

## Constat vérifié
Les deux tables possèdent déjà une contrainte `category_check` à 10 valeurs (`restaurant`, `cafe`, `shop`, `public`, `coiffeur`, `nature`, `sport`, `creatif`, `culture`, `jeux`). Aucune ligne n'utilise encore `librairie`.

## Changement
Une seule migration SQL, aucune modification de code applicatif.

```sql
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_category_check;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_category_check
  CHECK (category IN ('restaurant','cafe','shop','public','coiffeur','librairie',
                      'nature','sport','creatif','culture','jeux'));

ALTER TABLE public.location_proposals DROP CONSTRAINT IF EXISTS location_proposals_category_check;
ALTER TABLE public.location_proposals
  ADD CONSTRAINT location_proposals_category_check
  CHECK (category IN ('restaurant','cafe','shop','public','coiffeur','librairie',
                      'nature','sport','creatif','culture','jeux'));
```

## Détails techniques
- `events` n'est pas concerné : elle a son propre vocabulaire de catégories événementielles.
- Aucune donnée à migrer : `librairie` est une valeur neuve.
- Aucun impact sur les policies RLS, les triggers ou le code TypeScript.