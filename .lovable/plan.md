## Plan — Admin des événements + géocodage

Ajouter la gestion des events dans `src/pages/AdminPage.tsx` : nouvel onglet, bloc « à valider » sur le dashboard, et géocodage automatique à l'approbation (+ bouton manuel).

### 1. Nouvel onglet `events`

Ajouter `{ key: 'events', label: 'Événements' }` dans `tabs` (entre Propositions et Ajouter).

Contenu :
- Barre de recherche (nom / adresse / catégorie).
- Filtre statut : Tous / En attente / Publiés / Rejetés (défaut : En attente).
- Filtre provenance : Tous / Proposition user / Sourcing (agents Cowork, `user_id IS NULL`).
- Tri : plus récent / date_start.
- Cartes event affichant :
  - Nom + pastille couleur catégorie (`eventCategoryColor`) + emoji.
  - Dates (`date_start` → `date_end`), heure, durée.
  - Âge (min–max), météo, prix.
  - Adresse + lat/lng si géocodé (badge « Géocodé » vs « À géocoder »).
  - Website / Instagram (liens).
  - Photo miniature si présente.
  - Description (`note`), tronquée.
  - **Provenance** : « Proposé par <email> » (via `useUserEmails`) si `user_id` non nul, sinon « Sourcing ».
  - Date de création + badge statut coloré.
- Actions selon statut :
  - **Pending** : Approuver (géocodage auto puis `status='published'` → trigger +25 pts) / Rejeter / Éditer.
  - **Published** : Éditer / Regéocoder / Dépublier / Supprimer.
  - **Rejected** : Restaurer en pending / Supprimer.
- Modal d'édition inline reprenant les champs de `ProposeEventModal` + lat/lng manuels + bouton « Géocoder l'adresse ».

Data : `useAllEvents` (déjà présent) + invalidations `['events', ...]`.

### 2. Bloc dashboard « Événements à valider »

Nouveau bloc à côté de Propositions / Contributions :
- Titre + compteur (nombre de `status='pending'`).
- 5 plus récents (nom, catégorie couleur, date_start, provenance user/sourcing).
- « Voir tout » → bascule sur l'onglet Événements avec filtre pending.

### 3. Géocodage des events

Extraire une fonction `geocodeEventAddress(address)` réutilisant le même pattern que pour les lieux (Nominatim, chaîne de fallback Nantes → 44000 → …, délai 300ms, User-Agent). Elle retourne `{ lat, lng } | null`.

Points d'utilisation :
- **Approbation d'un event pending** : géocode `address` → écrit `lat`, `lng`, `status='published'` en un seul UPDATE. Si le géocodage échoue, afficher un toast d'erreur et NE PAS publier ; proposer l'édition manuelle (saisir lat/lng à la main).
- **Bouton « Géocoder l'adresse »** dans le modal d'édition (published ou pending) : lance Nominatim, préremplit les champs lat/lng du formulaire.
- **Regéocoder** (published) : idem, met à jour lat/lng seulement.
- Aucun géocodage côté proposition utilisateur (inchangé).

### 4. Détails techniques

- Réutiliser la logique Nominatim déjà utilisée pour les propositions de lieux (mêmes fallbacks, mêmes headers, mêmes délais).
- Emails proposeurs : passer les `user_id` non nuls à `useUserEmails`.
- Invalidations React Query : `['events', 'all']`, `['events', 'published-upcoming']`, `['my-events', userId]`, `['event', id]`.
- Aucune modification de BDD, hooks, ou autres pages.

### Fichier touché

- `src/pages/AdminPage.tsx` (onglet + bloc dashboard + modal édition event + géocodage).
