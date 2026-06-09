## Objectif
Rendre la section "Repas & horaires" (step 2) du formulaire de proposition conditionnelle : visible uniquement pour les catégories **Café** et **Restaurant**. Pour les autres catégories, cette section est complètement masquée et le flux passe directement de "Équipements" à "Photos".

## Fichier concerné
- `src/components/ProposeLocationModal.tsx`

## Modifications

### 1. Steps dynamiques
Remplacer le tableau statique `STEPS` par un calcul réactif basé sur `form.category` :
- **Café / Restaurant** : `['Infos', 'Équipements', 'Repas & horaires', 'Photos']` (4 steps)
- **Autres** : `['Infos', 'Équipements', 'Photos']` (3 steps)

### 2. Barre de progression
Adapter l'affichage des barres et des labels pour utiliser le tableau dynamique de steps au lieu du tableau statique.

### 3. Rendu conditionnel du contenu par step
- Step 0 (Infos) : inchangé.
- Step 1 (Équipements) : inchangé (la section "Réservation" reste conditionnelle Café/Restaurant comme aujourd'hui).
- Step 2 :
  - Si Café/Restaurant : afficher le bloc actuel "Repas & horaires" (meal cards + raccourcis).
  - Sinon : afficher le bloc "Photos" (upload / URL).
- Step 3 (uniquement si Café/Restaurant) : afficher le bloc "Photos".

### 4. Navigation et bouton footer
- Adapter `goNext` pour utiliser la longueur dynamique des steps.
- Adapter le footer :
  - Le bouton "Continuer" au step 1 envoie vers le step 2 (Repas ou Photos selon la catégorie).
  - Le check `disabled` sur le step Repas (`selectedMeals.length === 0`) ne s'applique que lorsque ce step est présent.
  - Le bouton "Envoyer la proposition" s'affiche correctement sur le dernier step (Photos), qu'il soit à l'index 2 ou 3.

### 5. Gestion du changement de catégorie en cours de formulaire
Si l'utilisateur revient au step 0 et change de catégorie (ex. Restaurant → Boutique), le recalcul dynamique des steps s'applique automatiquement lors de la navigation suivante.
