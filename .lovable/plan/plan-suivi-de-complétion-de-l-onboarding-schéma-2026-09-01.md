# Plan — Suivi de complétion de l'onboarding (schéma)

Migration de schéma uniquement. Aucune UI, aucun changement côté web dans ce lot
(le web sera fait dans un second temps).

## État actuel vérifié

Table `public.profiles` (RLS activé) — colonnes existantes :
`id, role, created_at, full_name, points, acquisition_source, acquisition_detail, acquisition_source_at`.

Aucune colonne `onboarding_*` ni `coachmarks_*` n'existe encore. La policy
« Users can update own profile » (FOR UPDATE, `USING auth.uid() = id`,
`WITH CHECK auth.uid() = id`) couvre déjà toute nouvelle colonne, et le trigger
`prevent_role_self_escalation_trg` continue de protéger `role`. Aucune RLS à créer.

## Migration à appliquer

Ajout de 4 colonnes + 2 contraintes CHECK sur `public.profiles`, en idempotent :

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step_max      smallint,
  ADD COLUMN IF NOT EXISTS onboarding_outcome       text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS coachmarks_outcome       text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_outcome_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_outcome_check
      CHECK (onboarding_outcome IS NULL OR onboarding_outcome IN ('completed', 'skipped'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_coachmarks_outcome_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_coachmarks_outcome_check
      CHECK (coachmarks_outcome IS NULL OR coachmarks_outcome IN ('completed', 'skipped'));
  END IF;
END $$;
```

### Sémantique des colonnes

- `onboarding_step_max` : slide le plus loin atteint (1 à 3). Swipe = bouton « Suivant ».
  On ne garde que le maximum (revenir en arrière ne l'efface pas).
- `onboarding_outcome` : `'completed'` (clic « Créer mon compte » / « Se connecter » depuis
  le 3e slide) ou `'skipped'` (clic « Passer » avant la fin).
- `onboarding_completed_at` : horodatage de cette décision (côté client, ISO 8601).
- `coachmarks_outcome` : `'completed'` (4 bulles vues jusqu'au bout) ou `'skipped'`
  (« Passer »). Cas particulier : si la 3e bulle ne trouve aucune fiche à ouvrir (liste vide
  ou réseau tombé), la visite s'arrête là et compte comme `'completed'`.

Vocabulaire fermé en `text` + CHECK (pas d'enum PG), cohérent avec le reste du schéma.

## Ce qui n'est PAS fait dans ce lot

- Pas de modification de UI / edge functions / types côté web.
- Pas de backfill (les nouvelles colonnes sont NULL pour les profils existants).
- Pas de nouvelle RLS ni de nouveau trigger.

## Limite d'exploitation

Un utilisateur qui ne crée jamais de compte reste invisible. Ces colonnes mesurent
« parmi les comptes créés, combien ont vu l'accueil en entier », pas le taux d'abandon global.
