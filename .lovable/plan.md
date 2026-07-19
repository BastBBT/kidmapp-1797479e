## Objectif

Ajouter un onglet **Activités** dans l'admin, symétrique à l'onglet **Lieux**, avec les mêmes filtres (statut, recherche, tri) et les mêmes actions d'édition (Publier/Masquer, Modifier, Supprimer).

## Contexte

Aujourd'hui l'onglet **Lieux** de `AdminPage.tsx` liste tout ce qui vit dans la table `locations` — sans distinction entre les vraies « places » (`restaurant`, `cafe`, `shop`, `public`, `coiffeur`) et les « activités » (`nature`, `sport`, `creatif`, `culture`, `jeux`). Ces deux groupes sont déjà définis dans `src/types/location.ts` (`PLACE_CATEGORIES` / `ACTIVITY_CATEGORIES`).

## Changements

Un seul fichier touché : `src/pages/AdminPage.tsx`.

1. **Type & liste d'onglets**
   - Ajouter `'activities'` à `AdminTab`.
   - Insérer `{ key: 'activities', label: 'Activités' }` dans `tabs` juste après `Lieux`.

2. **Rendu partagé Lieux / Activités**
   - Remplacer la condition `activeTab === 'locations'` par `activeTab === 'locations' || activeTab === 'activities'`.
   - En haut du bloc, calculer `const isActivitiesTab = activeTab === 'activities'` et filtrer la liste `locations` par groupe :
     - `locations` → catégorie ∈ `PLACE_CATEGORIES`
     - `activities` → catégorie ∈ `ACTIVITY_CATEGORIES`
   - Baser les 4 `counts` (all/published/unpublished/pending), la SearchBar, le tri et la liste rendue sur cette sous-liste.
   - Adapter les libellés dynamiques : « X lieux affichés » / « X activités affichées », placeholder de recherche (« nom, adresse ou site web » reste OK), message vide inchangé.

3. **Édition**
   - Le formulaire d'édition (`editingId` / `editForm`) est déjà générique côté catégorie via un `<select>` sur `categoryLabels`. On garde tel quel : depuis l'onglet Activités on éditera une activité avec les mêmes champs. Les toggles équipements restent visibles (utile si un jour une activité les utilise ; sans effet sinon).

4. **Dashboard (facultatif, à confirmer)**
   - Les stats « Lieux publiés / à valider » incluent aujourd'hui les activités. Je ne change pas le dashboard dans ce lot pour rester focus — dis-moi si tu veux aussi séparer les compteurs.

## Détails techniques

- Import à ajouter en haut du fichier : `PLACE_CATEGORIES, ACTIVITY_CATEGORIES` depuis `@/types/location`.
- Filtrage groupe fait via `const groupCats = isActivitiesTab ? ACTIVITY_CATEGORIES : PLACE_CATEGORIES; const scoped = locations.filter(l => (groupCats as readonly string[]).includes(l.category));`
- Les états `searchLocations`, `statusFilter`, `sortBy` sont partagés entre les deux onglets (comportement acceptable ; un utilisateur qui switch garde son filtre). Si tu préfères des états séparés, dis-le et je dédouble.

## Hors scope

- Pas de changement DB, ni de types, ni de fonctions Edge.
- Pas de modification des onglets Propositions / Événements / Contributions.
