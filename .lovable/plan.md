# Rattacher une sortie à un lieu déjà référencé

Objectif : permettre à l'admin de relier une sortie à un lieu existant (LAEP, ateliers hebdo) et de lui coller une étiquette de cadence courte. Rien ne change pour les utilisateurs tant que ces champs restent vides.

## 1. Base de données

Sur la table des sorties, ajout de deux champs facultatifs :

- **Lieu rattaché** (`location_id`) : référence vers un lieu existant. Si le lieu est supprimé, la sortie est simplement déliée, jamais supprimée. Un index est créé pour lister rapidement les sorties d'un lieu.
- **Cadence** (`recurrence_label`) : texte libre court, purement d'affichage. Aucun moteur de récurrence : les dates réelles restent les créneaux actuels.

Aucune donnée existante n'est modifiée : les deux champs restent vides partout. Les règles d'accès actuelles s'appliquent telles quelles — elles portent sur les lignes, pas sur les colonnes, donc les sorties publiées restent lisibles publiquement avec ces deux nouveaux champs.

## 2. Formulaire d'ajout de sortie (admin)

- Nouveau champ « Lieu (optionnel) » : un champ de recherche parmi les lieux déjà en base (recherche sur le nom et la ville, résultats cliquables).
  - Lieu choisi → l'adresse et les coordonnées du lieu sont reprises telles quelles, aucun géocodage n'est lancé, et le champ adresse libre est verrouillé/affiché en lecture.
  - Bouton « Retirer » → on revient exactement au comportement actuel : adresse libre + géocodage automatique.
- Nouveau champ « Cadence (optionnel) », avec l'aide « Reste court, ~20 caractères — le détail des jours et horaires va dans la description ».

## 3. Formulaire d'édition de sortie (admin)

Mêmes deux champs, préremplis depuis la sortie. Le lieu rattaché est affiché (nom + ville) avec possibilité de le changer ou de le retirer. Retirer le lieu ne vide pas l'adresse déjà enregistrée, mais réactive le géocodage si l'adresse est modifiée.

## Détails techniques

- Migration : `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL`, `ADD COLUMN IF NOT EXISTS recurrence_label text`, plus `CREATE INDEX IF NOT EXISTS idx_events_location_id ON public.events(location_id)`. Pas de nouvelle policy ni de nouveau GRANT (table existante, accès inchangés).
- `src/pages/AdminPage.tsx` :
  - `emptyEventForm` gagne `location_id: ''` et `recurrence_label: ''`.
  - Petit composant local `LocationPicker` (recherche parmi `useAllLocations()`, filtrage client sur `name`/`city`, liste limitée à ~8 résultats) réutilisé dans `AddEventTab` et dans le bloc d'édition de `EventsTab`.
  - `AddEventTab.handleAddEvent` : si un lieu est sélectionné, `address/lat/lng` proviennent du lieu et le bloc `geocodeAddress` est court-circuité ; `location_id` et `recurrence_label` (trim, `null` si vide) sont ajoutés au payload d'insert.
  - `EventsTab` : `startEdit` charge les deux champs dans `editDraft`, la sauvegarde les inclut dans le payload de mise à jour et applique la même règle de court-circuit du géocodage.
- `src/types/event.ts` : ajout de `location_id: string | null` et `recurrence_label: string | null` à `EventItem`.
- Aucun changement d'affichage côté public dans ce lot.
