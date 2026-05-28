Ajouter un bouton de partage sur la fiche lieu (`LocationPage.tsx`), positionné à gauche du bouton like existant et dans le même style graphique.

### Changements prévus

**Fichier : `src/pages/LocationPage.tsx`**

1. **Nouveau bouton de partage**
   - Inséré juste à gauche du bouton like (position : `top: 52px, right: 60px`).
   - Style identique au like : cercle 36px, fond blanc à 92% d'opacité, `borderRadius: 50%`, ombre `0 2px 8px rgba(0,0,0,0.15)`, bordure `none`.
   - Icône Lucide `Share2` (taille 18, couleur `var(--primary)`).

2. **Logique de partage**
   - Au clic : appel de `navigator.share({ title: location.name, text: "Découvre ce lieu kid-friendly sur Kidmapp !", url: window.location.href })`.
   - Fallback si `navigator.share` n'est pas disponible : copier l'URL dans le presse-papiers via `navigator.clipboard.writeText(window.location.href)`.
   - Afficher un petit feedback visuel (ex. un toast "Lien copié !" ou utilisation du système de notification natif).

3. **Aucun autre fichier modifié**
   - Pas de changement de style global ni de nouveau composant externe nécessaire.

### Résultat attendu
Un bouton rond blanc avec une icône de partage, situé juste à gauche du bouton like en haut à droite de l'image hero. Au tap, ouverture du menu natif de partage (mobile) ou copie du lien dans le presse-papiers (desktop).