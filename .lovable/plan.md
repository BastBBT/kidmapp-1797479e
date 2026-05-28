## Onglet "Lieux" de l'admin — filtre statut, tri, date d'ajout

Modifications dans `src/pages/AdminPage.tsx`, section `activeTab === 'locations'`.

### 1. Filtre par statut
Ajouter une rangée de pills sous la SearchBar :
- **Tous**
- **Publiés** (status = `published`)
- **Masqués** (status = `unpublished`)
- **À valider** (status = `pending`)

Avec un compteur entre parenthèses (ex. "Publiés (124)"). Par défaut sélection sur **Publiés** (réponse directe au besoin "afficher les lieux publiés, pas encore masqués"). État local `statusFilter`.

### 2. Tri
Petit `<select>` à droite de la SearchBar avec les options :
- **Plus récents** (created_at desc) — défaut
- **Plus anciens** (created_at asc)
- **Nom A→Z**

État local `sortBy`.

### 3. Date d'ajout sur les cartes
Sous l'adresse / à côté du `StatusBadge`, ajouter une petite ligne :
`Ajouté le 12 mars 2026` (format `Intl.DateTimeFormat` fr-FR, comme déjà utilisé pour les contributions ligne 788), en `12px` `var(--text-muted)` DM Sans.

### Détails techniques
- Le hook `useAllLocations()` retourne déjà `created_at` et `status` — aucune requête supplémentaire.
- Le filtrage existant `matchSearch(...)` est combiné avec `statusFilter` puis trié par `sortBy` avant rendu.
- Aucun changement DB, aucun changement d'autre page.
