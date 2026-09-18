# Filtre par catégorie dans l'onglet admin « Lieux & activités »

## Objectif

Dans l'onglet « Lieux & activités » de la page admin, ajouter un filtre par type (restaurant, café, boutique… pour les lieux ; nature, sport, créatif… pour les activités) afin de retrouver et modifier plus vite les fiches d'une même catégorie.

## Comportement

- Une nouvelle rangée de pastilles de catégories, affichée sous les filtres existants (Tous / Lieux / Activités, puis statut).
- Les pastilles proposées dépendent du groupe actif :
  - groupe « Tous » ou « Lieux » → catégories de lieux (Restaurant, Café, Boutique, Lieu public, Coiffeur, Librairie) ;
  - groupe « Activités » → catégories d'activités (Nature, Sport, Créatif, Culture, Jeux).
- Chaque pastille affiche son nombre de fiches (comptées dans le périmètre du groupe actif). Une pastille « Toutes » permet de revenir à aucun filtre.
- Cliquer une pastille active la désélectionne (retour à « Toutes »).
- Le filtre catégorie se combine avec la recherche texte, le groupe et le statut déjà en place.
- Changer de groupe (Lieux ↔ Activités) réinitialise le filtre catégorie pour éviter une liste vide incohérente.
- Libellés en français (page admin non traduite), avec les icônes de catégories déjà disponibles (`CATEGORY_ICONS`).

## Détails techniques

- Fichier : `src/pages/AdminPage.tsx`, bloc `activeTab === 'locations'` (lignes ~984-1093).
- Nouvel état local `categoryFilter: string | null` (avec `groupFilter`, `statusFilter`, `searchLocations`, `sortBy`).
- Pastilles reposant sur `PLACE_CATEGORIES` / `ACTIVITY_CATEGORIES` et `categoryLabels` de `src/types/location.ts`, même style visuel que les pastilles de groupe existantes.
- Ajout d'un `.filter((loc) => !categoryFilter || loc.category === categoryFilter)` dans la chaîne de filtrage existante.
- Aucune migration, aucun changement de requête réseau : le filtrage est côté client sur la liste déjà chargée.
- Vérifier `/tmp/observability/build-errors.log` après modification et corriger toute erreur.
