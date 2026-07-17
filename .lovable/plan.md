## Plan — Événements datés (nouvel onglet Sorties)

Table `events` indépendante (miroir app iOS), géocodage à l'approbation admin, favoris privés, gamification +25 pts à la publication, nouvel onglet "Sorties" avec carte week-end, fiche event, flow de proposition et intégration admin.

### 1. Base de données (migration Supabase)

**Table `public.events`** :
- Colonnes : `id uuid pk default gen_random_uuid()`, `name text not null`, `category text not null` (Spectacle/Atelier/Festival/Fête/Marché/Autre), `address text`, `lat float8`, `lng float8`, `date_start date not null`, `date_end date`, `time text`, `age_min int`, `age_max int`, `duration text`, `weather text` (**"En intérieur" / "En extérieur" / "Les deux"** — libellés FR, jamais indoor/outdoor/both, pour parité iOS qui affiche `event.weather` tel quel), `price text`, `website text`, `instagram text`, `photo text`, `note text` (description), `status text not null default 'pending'` (pending/published/rejected), `user_id uuid references auth.users on delete set null`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- GRANT SELECT à `anon`+`authenticated` ; GRANT INSERT/UPDATE/DELETE à `authenticated` ; GRANT ALL à `service_role` (pour les agents Cowork).
- Trigger `update_updated_at_column`.
- RLS :
  - SELECT public : `status = 'published'`.
  - SELECT propriétaire : `user_id = auth.uid()`.
  - SELECT admin : `is_admin(auth.uid())`.
  - INSERT `authenticated` : `user_id = auth.uid() AND status = 'pending'` (WITH CHECK).
  - UPDATE admin : tout. UPDATE propriétaire : uniquement si `status = 'pending'` (avant + après) et sans changer `user_id`/`status`.
  - DELETE admin ou propriétaire (pending).

**Table `public.event_favorites`** :
- `user_id uuid`, `event_id uuid references events on delete cascade`, `created_at`, unique (user_id, event_id).
- RLS : `user_id = auth.uid()` sur toutes opérations. GRANT à `authenticated` + `service_role`.

**Gamification** :
- Trigger AFTER UPDATE OF status : quand `NEW.status='published' AND OLD.status<>'published' AND user_id IS NOT NULL` → `award_points(user_id, 25, 'event_published', id::text)`. Réutilise la fonction existante.

**Index** : `date_start`, `status`, `user_id`.

### 2. Sourcing externe (agents Cowork)

Les agents Cowork écrivent via REST Supabase avec `service_role` directement dans `events` (Notion abandonné). Les RLS ne s'appliquent pas au service role ; le trigger points ne s'active pas car `user_id` sera null pour ces insertions.

### 3. Géocodage admin

Réutilise le pattern existant de l'admin (Nominatim côté client dans `AdminPage.tsx`). À l'approbation : géocode `address` → `lat/lng` puis `UPDATE status='published'` (trigger +25 pts). Aucun géocodage côté proposition utilisateur.

### 4. Couleurs & catégories (parité iOS)

Tokens ajoutés dans `src/index.css` :
- `--event-spectacle: #EF9F27` (ambre)
- `--event-atelier: #7F5BB5` (violet)
- `--event-festival: #C64B7A` (rose)
- `--event-fete: #D95F3B` (terracotta)
- `--event-marche: #3B7D6E` (teal)
- `--event-autre: #EF9F27` (défaut = ambre)

Utilisés via `var(--event-*)` dans hero, chips, pins carte. Aucun hex hardcodé dans les composants.

Icônes catégories events : emoji SVG data URIs dans `src/assets/icons.ts` (🎭 Spectacle, 🎨 Atelier, 🎉 Festival, 🎊 Fête, 🛍️ Marché, ✨ Autre).

### 5. Nouvelle page "Sorties" (`/sorties`)

- Route ajoutée dans `src/App.tsx`.
- `BottomNav.tsx` : 4 onglets (Explorer, Sorties, Sauvés, Compte) + bouton central "Proposer" — aligné iOS.
- Composants :
  - `AgeFilter` réutilisé (`(age_min ?? 0) ≤ max ET (age_max ?? 99) ≥ min`).
  - `WeekendPicker` : sélecteur de week-ends (samedi/dimanche) sur ~8 semaines glissantes. Label "Ce week-end" pour la semaine courante.
  - `EventsMap` (Leaflet) : inspiré de `MapView`, pins colorés par catégorie (tokens ci-dessus).
  - Liste groupée par week-end, triée chronologiquement. Filtre `date_start >= today` côté client (et requête `.gte('date_start', today)`).
- Hook `useEvents({ from, to, ageBucket })` (TanStack Query, `status='published'`).

### 6. Fiche événement (`/event/:id`)

- Hero coloré par catégorie (token `--event-<cat>`), bloc date en évidence (`date_start → date_end`, `time`).
- Grille Âge / Durée / Prix / Météo.
- Mini-carte Leaflet centrée sur lat/lng.
- Description (`note`), photo optionnelle.
- CTA 1 « Voir plus de détails » → `website` (nouvel onglet).
- CTA 2 « Ajouter à mon calendrier » → génération `.ics` client (blob download).
- Bouton ♥ favori (event_favorites).

### 7. Favoris

- Nouveau `useEventFavorites` (miroir de `useFavorites`).
- `SavedPage` : sélecteur segmenté "Lieux & activités" ↔ "Événements". Events avec `date_start < today` grisés + label "Passé".

### 8. Proposition — 3 chemins

Le modal d'entrée `useProposalModal`/`ProposeLocationModal` propose 3 cartes de départ :

1. **Un lieu** → form existant, catégories lieux.
2. **Une activité** → même form lieu, catégorie pré-réglée sur une activité (Nature/Sport/Créatif/Culture/Jeux), champs activité visibles (déjà en place).
3. **Un événement** → nouveau `ProposeEventModal.tsx` :
   - Champs : nom, catégorie (Spectacle/Atelier/Festival/Fête/Marché/Autre), adresse, date_start, time, date_end (optionnel), age_min/age_max, duration, **weather (En intérieur / En extérieur / Les deux)**, price (texte libre détaillé), website (billetterie), instagram optionnel, photo optionnelle (bucket `location-photos`, préfixe `events/`), description.
   - Submit : insert `events` avec `status='pending'`, `user_id=auth.uid()`, pas de lat/lng.

Photo upload : réutilise `location-photos` avec préfixe `events/<uuid>.jpg` — pas de nouveau bucket.

### 9. Admin

- Nouvel onglet "Événements" dans `AdminPage.tsx` : liste `status='pending'` puis publiés.
- Approbation : géocode `address` (Nominatim) → écrit `lat/lng` + `status='published'` (trigger +25 pts).
- Rejet : `status='rejected'`.
- Édition libre des events publiés (comme les lieux).

### 10. Compte utilisateur

Section "Mes événements proposés" dans `AccountPage.tsx` à côté de "Mes propositions de lieux", avec badges statut (En attente / Publié / Rejeté).

### Détails techniques

- Types : `src/types/event.ts` (`EventCategory`, `EventWeather = 'En intérieur' | 'En extérieur' | 'Les deux'`, `EventItem`).
- Helpers : `src/lib/weekend.ts` (calcul samedi/dimanche + label "Ce week-end"), `src/lib/ics.ts` (génération .ics minimal).
- Aucun hex hardcodé — tout passe par tokens CSS `--event-*`.
- Types Supabase régénérés automatiquement après migration.

### Fichiers touchés / créés

- Migration Supabase (events + event_favorites + trigger points).
- `src/types/event.ts` (nouveau).
- `src/lib/weekend.ts`, `src/lib/ics.ts` (nouveaux).
- `src/hooks/useEvents.ts`, `src/hooks/useEventFavorites.ts` (nouveaux).
- `src/components/WeekendPicker.tsx`, `src/components/EventsMap.tsx`, `src/components/EventCard.tsx`, `src/components/ProposeEventModal.tsx` (nouveaux).
- `src/pages/SortiesPage.tsx`, `src/pages/EventPage.tsx` (nouveaux).
- `src/App.tsx` (routes + modale event).
- `src/components/BottomNav.tsx` (onglet Sorties).
- `src/components/ProposeLocationModal.tsx` (écran d'entrée 3 chemins) ou wrapper amont.
- `src/pages/SavedPage.tsx` (segmented "Lieux/Événements").
- `src/pages/AccountPage.tsx` (mes events).
- `src/pages/AdminPage.tsx` (onglet events + géocodage).
- `src/index.css` (tokens couleurs), `src/assets/icons.ts` (icônes catégories events).