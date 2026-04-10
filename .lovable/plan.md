

## Augmenter la limite du champ Note à 500 caractères

### Contexte
Le champ "Note" est actuellement limité à 300 caractères dans l'admin (ajout + édition) et 200 dans le formulaire de proposition. La colonne `note` en base est de type `text` sans contrainte de longueur — il n'y a donc rien à modifier côté base de données. La limite est uniquement côté front-end.

Cependant, pour que l'app iOS puisse aussi respecter cette limite, on va ajouter une contrainte CHECK en base de données à 500 caractères. Ainsi, les deux apps (web et iOS) seront alignées.

### Plan

**1. Migration base de données** — Ajouter une contrainte CHECK sur les 3 tables concernées :
```sql
ALTER TABLE public.locations ADD CONSTRAINT locations_note_length CHECK (char_length(note) <= 500);
ALTER TABLE public.location_proposals ADD CONSTRAINT proposals_note_length CHECK (char_length(note) <= 500);
ALTER TABLE public.contributions ADD CONSTRAINT contributions_note_length CHECK (char_length(note) <= 500);
```

**2. `src/pages/AdminPage.tsx`** — Modifier les 4 occurrences de `300` liées au champ note :
- Ligne 674 : `.slice(0, 300)` → `.slice(0, 500)`
- Ligne 676 : `maxLength={300}` → `maxLength={500}`
- Ligne 681 : `}/300` → `}/500`
- Ligne 842 : `.slice(0, 300)` → `.slice(0, 500)`
- Ligne 844 : `maxLength={300}` → `maxLength={500}`
- Ligne 848 : `}/300` → `}/500`

**3. `src/components/ProposeLocationModal.tsx`** — Modifier les 3 occurrences de `200` :
- Ligne 289 : `.slice(0, 200)` → `.slice(0, 500)`
- Ligne 291 : `maxLength={200}` → `maxLength={500}`
- Ligne 296 : `}/200` → `}/500`

### Résultat
- La limite est de 500 caractères partout (web + futur iOS via la contrainte DB)
- L'app iOS pourra lire la contrainte ou simplement appliquer la même limite de 500

