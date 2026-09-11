# Ajout d'une colonne `locale` sur `profiles`

## Objectif
Ajouter une colonne `locale` sur la table `profiles` pour stocker la langue préférée de l'utilisateur (français par défaut). Aucune autre colonne n'est touchée, rien n'est renommé.

## Migration SQL

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'fr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_locale_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_locale_check CHECK (locale IN ('fr','en','es'));
  END IF;
END $$;
```

`ADD COLUMN IF NOT EXISTS` est idempotent ; le bloc `DO $$` rend la contrainte idempotente aussi (Postgres n'a pas de `IF NOT EXISTS` pour les contraintes nommées).

## Vérification de la sécurité existante

- **GRANT** : `profiles` accorde déjà `SELECT, INSERT, UPDATE TO authenticated` et `ALL TO service_role` (pas de DELETE). La nouvelle colonne hérite automatiquement de ces privilèges — aucun GRANT supplémentaire à écrire (la table existe déjà).
- **RLS** : la policy existante « Users can update own profile » a :
  - `USING (auth.uid() = id)`
  - `WITH CHECK (auth.uid() = id)`

  Cette condition est indépendante des colonnes : elle autorise un utilisateur à mettre à jour n'importe quelle colonne de sa propre ligne, y compris la nouvelle colonne `locale`, exactement comme `digest_day` et `zone_city`. Aucune nouvelle policy à créer.
- **Trigger existant** : `prevent_role_self_escalation` (BEFORE UPDATE) annule silencieusement un changement de `role`. Sans rapport avec `locale`, mais c'est le patron à réutiliser si une colonne de `profiles` doit un jour être protégée d'une écriture cliente.

## Schéma appliqué (confirmation attendue)

| Colonne | Type | Nullable | Défaut | Contrainte |
|---------|------|----------|--------|------------|
| `locale` | text | NOT NULL | `'fr'` | `CHECK (locale IN ('fr','en','es'))` |

Aucun impact sur le code web/iOS existant (colonne optionnelle côté lecture, défaut `'fr'` pour les lignes déjà présentes via le backfill automatique du DEFAULT).
