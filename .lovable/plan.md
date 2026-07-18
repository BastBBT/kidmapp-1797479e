## Constat

Actuellement, quand l'utilisateur choisit « Un lieu » ou « Une activité » dans le chooser, il tombe sur **exactement le même écran** (`ProposeLocationModal`). Seule différence : `initialCategory` (`restaurant` vs `nature`). Le titre, le picker de catégorie (qui affiche les 10 catégories mélangées), les labels et placeholders sont identiques.

Le formulaire gère déjà bien les champs métier différents (étape 1 : détails activité vs équipements ; étape « Repas & horaires » masquée hors resto/café). Il ne manque que la **cohérence visuelle et éditoriale** entre les deux flux.

## Objectif

Faire en sorte que le formulaire adopte l'identité du type choisi (lieu OU activité), sans toucher au schéma BDD ni à la logique métier.

## Changements

Un seul fichier : `src/components/ProposeLocationModal.tsx`.

Ajouter une prop `mode: 'location' | 'activity'` transmise depuis `src/App.tsx` (déjà connu via `proposalMode`), puis conditionner :

1. **Titre du modal**
   - lieu → « Proposer un lieu »
   - activité → « Proposer une activité »

2. **Picker de catégorie (étape 0)** — filtrer les options selon le mode :
   - lieu → `restaurant, cafe, shop, public, coiffeur` (5 pastilles)
   - activité → `nature, sport, creatif, culture, jeux` (5 pastilles)
   - Si l'utilisateur change de type via le back button, `initialCategory` remet la valeur cohérente. On garde la possibilité de revenir au chooser.

3. **Labels & placeholders textuels**
   - « Nom du lieu * » ↔ « Nom de l'activité * »
   - Placeholder nom : « Le Petit Beurre » ↔ « Balade au jardin des Plantes »
   - « Un mot sur ce lieu… » ↔ « Un mot sur cette activité… »
   - Titre étape 1 (déjà différencié : « Équipements pour les enfants » vs « Détails activité ») → OK, on ne touche pas.

4. **Toasts d'erreur/succès**
   - Message de succès inchangé (« Proposition envoyée »), mais on peut préciser dans la description : « Merci ! On vérifie ce lieu/cette activité avant publication. »

5. **Reset**
   - `resetAll` remet `category` à `initialCategory` (au lieu du dur `restaurant`), pour rester dans le bon type après fermeture.

Aucune modif de :
- schéma BDD ou table cible (`location_proposals`)
- structure des étapes / stepper
- logique meals ou équipements

## Détails techniques

- Nouveau param optionnel `mode?: 'location' | 'activity'` (défaut `'location'`).
- Dans `App.tsx`, passer `mode={proposalMode === 'activity' ? 'activity' : 'location'}`.
- Constantes internes : `PLACE_CATEGORY_OPTIONS`, `ACTIVITY_CATEGORY_OPTIONS`, sélection selon `mode`.
- Un helper `copy` retournant les libellés (title, name label/placeholder, note placeholder) selon le mode, pour garder le JSX lisible.
