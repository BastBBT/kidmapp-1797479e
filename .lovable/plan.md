# Suivi d'usage de l'assistant mascotte (schéma)

Migration de schéma uniquement. Aucun changement de code React, aucun
changement de comportement visible — uniquement du tracking en base.

## État actuel vérifié

Table `public.profiles` (RLS activé) — colonnes existantes confirmées :
`id, role, created_at, full_name, points, acquisition_source, acquisition_detail,
acquisition_source_at, onboarding_step_max, onboarding_outcome,
onboarding_completed_at, coachmarks_outcome, digest_channel, digest_day,
zone_city, zone_district, zone_lat, zone_lng, zone_radius_km,
digest_email_enabled, digest_push_enabled, locale`.

Aucune colonne `assistant_*` n'existe encore. Contraintes existantes :
`profiles_role_check`, `profiles_points_range_check`, `profiles_locale_check`,
`profiles_digest_channel_check`, `profiles_digest_day_check`,
`profiles_onboarding_outcome_check`, `profiles_coachmarks_outcome_check`,
`profiles_id_fkey`, `profiles_pkey`.

Policies existantes (RLS activé) :
- « Users can read own profile » (SELECT, `auth.uid() = id`)
- « Admins can read all profiles » (SELECT, `is_admin(auth.uid())`)
- « Users can update own profile » (UPDATE, `auth.uid() = id` WITH CHECK)
- « profiles_insert_self » (INSERT, WITH CHECK `auth.uid() = id`)

La policy UPDATE couvre déjà toute nouvelle colonne — les deux compteurs
seront lisibles et modifiables par le propriétaire de la ligne, comme les
autres colonnes. Les fonctions security definer écrivent pour le compte de
l'appelant sans passer par RLS.

## Migration à appliquer

Idempotente (`ADD COLUMN IF NOT EXISTS`, `DO $$` pour la contrainte nommée) :

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assistant_opens_count       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assistant_completions_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_assistant_counts_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_assistant_counts_check
      CHECK (assistant_completions_count <= assistant_opens_count);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_assistant_opened()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET assistant_opens_count = assistant_opens_count + 1
   WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.record_assistant_completed()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET assistant_completions_count = assistant_completions_count + 1
   WHERE id = auth.uid()
     AND assistant_completions_count < assistant_opens_count;
$$;

GRANT EXECUTE ON FUNCTION public.record_assistant_opened()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_assistant_completed() TO authenticated;
```

### Sémantique

- `assistant_opens_count` : nombre de fois où l'utilisateur a ouvert
  l'assistant mascotte d'Explorer. `NOT NULL DEFAULT 0`.
- `assistant_completions_count` : nombre de fois où l'utilisateur a mené
  une session de l'assistant jusqu'au bout. `NOT NULL DEFAULT 0`.
- `profiles_assistant_counts_check` : `assistant_completions_count <=
  assistant_opens_count`. Garantit la cohérence : on ne peut pas terminer
  plus de sessions qu'on en a ouvertes.
- `record_assistant_opened()` : incrémente `assistant_opens_count` de 1
  pour `auth.uid()`. Une ligne par appelant — ne touche que la ligne du
  caller, pas de paramètre.
- `record_assistant_completed()` : incrémente `assistant_completions_count`
  de 1 pour `auth.uid()`, **seulement si** `assistant_completions_count <
  assistant_opens_count`. La condition `WHERE` empêche de dépasser le
  nombre d'ouvertures — la contrainte CHECK est une seconde barrière.

Les deux fonctions sont `SECURITY DEFINER` : elles s'exécutent avec les
droits du propriétaire (`postgres`) et contournent RLS, donc l'utilisateur
n'a pas besoin de droits UPDATE directs sur `profiles` pour les appeler
(ils existent déjà via la policy, mais c'est neutre).

## Sécurité

- **GRANT** : `profiles` accorde déjà `SELECT, INSERT, UPDATE TO
  authenticated` et `ALL TO service_role`. Les nouvelles colonnes héritent
  automatiquement de ces privilèges — aucun GRANT supplémentaire à écrire
  (la table existe déjà).
- **RLS** : aucune policy à créer. La policy « Users can update own
  profile » (`auth.uid() = id`) couvre les nouvelles colonnes en lecture et
  écriture côté client ; les fonctions security definer écrivent pour le
  compte de l'appelant sans passer par RLS.
- **Trigger** : aucun trigger à créer. L'incrémentation se fait via les
  RPC, pas par trigger.
- **Sécurité des fonctions** : `SET search_path = public` + `SECURITY
  DEFINER`, patron cohérent avec `award_points()`, `is_admin()` etc.

## Ce qui n'est PAS fait dans ce lot

- Pas de modification de UI / edge functions / code React.
- Pas de backfill (les nouvelles colonnes sont à 0 pour tous les profils
  existants via le DEFAULT).
- Pas de nouvelle RLS ni de nouveau trigger.
