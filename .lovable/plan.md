## Objectif

Versionner en migration idempotente le schéma cœur (`profiles` + `is_admin` + `handle_new_user` + trigger auth + policies RLS + `prevent_role_self_escalation` + trigger) avec fidélité byte-à-byte depuis les dumps live. Nettoyage ciblé : déduplication du trigger anti-escalade.

## État constaté (dumpé depuis le live)

**Table `public.profiles`** : `id uuid PK NOT NULL`, `role text NOT NULL DEFAULT 'user'`, `created_at timestamptz NOT NULL DEFAULT now()`, `full_name text NULL`, `points int NOT NULL DEFAULT 0`, `acquisition_source text NULL`, `acquisition_detail text NULL`, `acquisition_source_at timestamptz NULL`. FK `id REFERENCES auth.users(id) ON DELETE CASCADE` à vérifier via `pg_constraint` juste avant l'écriture et coller la définition live.

**`public.is_admin(uuid)`** (dumpé) :
```
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  )
$function$
```

**`public.handle_new_user()`** (dumpé, corps identique au live, pas de fallback email) :
```
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'user',
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')), '')
  );
  RETURN NEW;
END;
$function$
```

**`public.prevent_role_self_escalation()`** (dumpé) :
```
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$function$
```

**Triggers** :
- `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`
- Sur `public.profiles`, deux triggers dupliqués (`_trg` et `_trigger`), tous deux `BEFORE UPDATE ... FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation()`.

**Policies `public.profiles`** (dumpées) :
- `profiles_insert_self` FOR INSERT TO authenticated WITH CHECK `(auth.uid() = id)`
- `Users can read own profile` FOR SELECT TO authenticated USING `(auth.uid() = id)`
- `Admins can read all profiles` FOR SELECT TO authenticated USING `is_admin(auth.uid())`
- `Users can update own profile` FOR UPDATE TO authenticated USING `(auth.uid() = id)` WITH CHECK `(auth.uid() = id)`

## Contenu de la migration (ordre dépendant)

1. `CREATE TABLE IF NOT EXISTS public.profiles(...)` — colonnes exactes + FK vers `auth.users`.
2. `GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;` (pas de grant `anon`).
3. `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`
4. `CREATE OR REPLACE FUNCTION public.is_admin(uuid)` — corps byte-à-byte. **Placé avant les policies et `prevent_role_self_escalation`** qui en dépendent.
5. `DROP POLICY IF EXISTS ...` + `CREATE POLICY ...` pour les 4 policies, prédicats copiés tels quels.
6. `CREATE OR REPLACE FUNCTION public.handle_new_user()` — corps byte-à-byte.
7. `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;` puis recréation à l'identique.
8. `CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()` — corps byte-à-byte.
9. **Déduplication du trigger anti-escalade (option B)** :
   - `DROP TRIGGER IF EXISTS prevent_role_self_escalation_trg ON public.profiles;` (retire le doublon vestige).
   - `DROP TRIGGER IF EXISTS prevent_role_self_escalation_trigger ON public.profiles;` puis recréation : `CREATE TRIGGER prevent_role_self_escalation_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();` (toutes colonnes, pas `OF role`, conforme au live).

Neutre fonctionnellement : la fonction est idempotente (au 2ᵉ passage, `NEW.role = OLD.role` → `IS DISTINCT FROM` faux → no-op). La migration devient la source de vérité propre.

## Ce qui n'est pas touché

- Corps de `handle_new_user`, `is_admin`, `prevent_role_self_escalation` (identiques au live).
- Flux front `signUp`/`signIn`, templates email, `rate_limit_email_sent`.
- Données existantes de `profiles`.
- Autres fonctions/triggers hors du schéma cœur listé ici.
