# Feedback post-événement « Tu y étais ? »

## 1. Migration DB

Nouvelle table `public.event_feedback` :
- `id uuid PK default gen_random_uuid()`
- `event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `verdict text NOT NULL CHECK (verdict IN ('up','down'))`
- `comment text` (max 200 côté client)
- `created_at timestamptz NOT NULL default now()`
- `UNIQUE (event_id, user_id)`
- Index sur `event_id`

GRANTs :
- `SELECT` → `anon`, `authenticated` (lecture publique pour agrégats)
- `INSERT/UPDATE/DELETE` → `authenticated`
- `ALL` → `service_role`

RLS activée + policies :
- Lecture publique (anon + authenticated)
- Insert/Update/Delete : `auth.uid() = user_id`

Trigger d'attribution de points : `AFTER INSERT` → `award_points(user_id, 5, 'event_feedback', id::text)` (cohérent avec la grille existante).

## 2. UI web

**Nouveau composant `EventFeedbackCard.tsx`** affiché uniquement sur événements passés (date < aujourd'hui) :
- Titre « Tu y étais ? C'était comment ? »
- Deux boutons 👍 / 👎 (style capsule, actif = coloré)
- Champ `textarea` optionnel, placeholder « Un mot pour les autres familles ? », maxLength 200, compteur
- Bouton « Enregistrer » (upsert sur `event_id + user_id`)
- État confirmé : bandeau « Merci ! » avec choix affiché + lien « Modifier »
- Utilisateur non connecté → même gate d'auth que Contribuer (ouvrir `AuthModal`)

**Nouveau hook `useEventFeedback(eventId)`** :
- Fetch feedback courant de l'utilisateur (si connecté)
- Fetch agrégats publics (count up/down)
- Mutation `upsert` avec invalidation TanStack Query

**Intégration** :
- `src/pages/EventPage.tsx` : afficher `EventFeedbackCard` en remplacement/complément du bandeau « Cet événement est terminé » pour les events passés
- `src/pages/SavedPage.tsx` : sur les cartes d'événements passés grisés, ajouter accès rapide (via le tap qui ouvre déjà `EventPage`, donc pas de duplication)

## 3. Admin

Dans `AdminPage.tsx` onglet Events :
- Sur chaque événement (passé de préférence), afficher compteurs `👍 N / 👎 M`
- Bouton « Voir les commentaires » ouvrant un dialog qui liste les feedbacks (verdict, comment, date, nom du user via `get_contributor_names`)

## Détails techniques

- Types Supabase régénérés après migration → utiliser `event_feedback` typé
- Détection "past" : réutiliser la logique existante d'`EventPage`/`EventCard` (comparaison date fin/début avec `now()`)
- Upsert : `.upsert({...}, { onConflict: 'event_id,user_id' })`
- Pas de bouton favori ni CTA calendrier sur past events (déjà en place)

## Hors scope

- Modération des commentaires (pas demandé)
- Notifications aux organisateurs
- Agrégats visibles côté public sur la fiche (uniquement admin pour l'instant, sauf si tu veux l'ajouter — à confirmer)
