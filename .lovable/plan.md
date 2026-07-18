# Plan : Tri par date d'événement dans l'admin

## Objectif
Dans l'onglet **Événements** de l'admin (`/gestion-k1dm4p`), ajouter une possibilité de trier la liste par **date d'événement** (date de début `date_start`), en complément du tri actuel par date de création.

## État actuel vérifié
- L'onglet Événements est géré par le composant interne `EventsTab` dans `src/pages/AdminPage.tsx`.
- Le fetch est actuellement trié sur `created_at DESC`.
- Les filtres existants sont : statut (pending / published / rejected / all), provenance (all / user / sourcing), et recherche textuelle.
- Aucun contrôle de tri n'existe aujourd'hui.

## Implémentation

### 1. Ajout d'un état de tri
Ajouter dans `EventsTab` un état local :
- `eventSort`: `'eventDateDesc' | 'eventDateAsc' | 'createdAtDesc'`
- Valeur par défaut : `'eventDateDesc'` (plus proche → plus lointain), utile pour la validation d'événements à venir.

### 2. Contrôle utilisateur
Ajouter une ligne de pills de tri juste après les filtres existants (statut + provenance) :
- **Date d'événement ↓** (plus proche en premier)
- **Date d'événement ↑** (plus lointain en premier)
- **Création** (tri actuel par `created_at` décroissant)

Style : reprendre le même `pillStyle` déjà utilisé pour les filtres statut/provenance, avec le même état actif/inactif.

### 3. Logique de tri
Remplacer le rendu direct de `filtered` par une version triée :
- `eventDateDesc` : `date_start` décroissant
- `eventDateAsc` : `date_start` croissant
- `createdAtDesc` : `created_at` décroissant (comportement actuel)

Les dates `date_start` sont des chaînes ISO ; la comparaison lexicographique suffit.

### 4. Aucun changement de backend
Pas de migration ni de modification d'API : le tri s'applique en mémoire sur les événements déjà chargés par `useQuery(['admin-events'])`.

## Fichier modifié
- `src/pages/AdminPage.tsx` uniquement (partie `EventsTab`).

## Non inclus
- Pas de tri côté base de données (le volume d'événements reste faible, tri client suffisant).
- Pas de persistance du choix de tri dans l'URL ou le localStorage.