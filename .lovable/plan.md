

## Corriger la contrainte de catégorie en base de données

**Problème** : La table `locations` possède une contrainte CHECK (`locations_category_check`) qui n'autorise que `restaurant`, `cafe`, `shop` et `public`. La valeur `coiffeur` est rejetée par la base, ce qui bloque toute insertion ou modification avec cette catégorie.

**Correction** : Une migration SQL pour supprimer l'ancienne contrainte et la recréer en incluant `coiffeur`.

```sql
ALTER TABLE public.locations DROP CONSTRAINT locations_category_check;
ALTER TABLE public.locations ADD CONSTRAINT locations_category_check
  CHECK (category = ANY (ARRAY['restaurant','cafe','shop','public','coiffeur']));
```

**Fichiers modifiés** : Aucun fichier de code a changer, uniquement une migration base de données.

Cela corrigera l'édition, l'ajout admin et l'approbation de propositions pour la catégorie coiffeur.

