# Migration : aligner `locations_note_length` sur la limite UI (1000)

## Contexte vérifié
- Base : `locations_note_length` = `CHECK (char_length(note) <= 500)` ✓ confirmé
- `AdminPage.tsx` (locations) : `slice(0, 1000)` + compteur `/1000` ✓ confirmé (lignes 1623, 1887)
- `ProposeLocationModal.tsx` (proposals) : `maxLength={500}` + `slice(0, 500)` ✓ confirmé → contrainte `proposals_note_length` (500) reste cohérente, **non touchée**

## Migration SQL
```sql
ALTER TABLE public.locations DROP CONSTRAINT locations_note_length;
ALTER TABLE public.locations ADD CONSTRAINT locations_note_length CHECK (char_length(note) <= 1000);
```

- `public.locations` est une table existante (GRANT + RLS déjà en place) → aucune modification d'accès requise.
- Aucun trigger, index ou backfill impliqué.
- `location_proposals.proposals_note_length` n'est pas modifié (cohérent avec l'UI à 500).

## Post-migration
Vérifier le linter et confirmer qu'aucun avertissement nouveau n'apparaît.
