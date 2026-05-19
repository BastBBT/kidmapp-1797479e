## Ajout du bouton Instagram dans "Mon compte"

Ajouter un bouton "Suivez-nous sur Instagram" dans `src/pages/AccountPage.tsx`, placé entre le bouton "Se déconnecter" et la section `<DeleteAccountSection />` (zone dangereuse).

### Comportement
- Lien vers `https://instagram.com/kidmapp`
- Ouverture dans un nouvel onglet (`target="_blank"`, `rel="noopener noreferrer"`)
- Icône Instagram à gauche (icône `Instagram` de `lucide-react`)
- Flèche ↗ (icône `ArrowUpRight` de `lucide-react`) à droite

### Style
- Même gabarit que le bouton "Se déconnecter" (full width, padding 14px, border-radius 100px, bordure 1.5px) pour rester cohérent
- Variante visuelle légèrement plus engageante : fond `var(--surface)` (au lieu de transparent) avec accent couleur primaire sur le texte et l'icône Instagram, pour le distinguer du bouton de déconnexion neutre
- Marge `marginTop` ~10px pour séparer du bouton précédent
- Police DM Sans 14px, weight 600

### Hors scope
- Aucune modification backend, routing, ou autre page
- Pas de page "À propos" dans ce lot (malgré le titre de la demande, seul le bouton Instagram est décrit)
