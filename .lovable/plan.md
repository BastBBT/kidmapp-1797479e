Problème constaté
-----------------
La barre de navigation inférieure comporte 5 éléments (Explorer, Sorties, Proposer, Sauvegardés, Mon compte). En viewport mobile étroit, le label « MON COMPTE » dépasse et est coupé (cf. screenshot).

Plan de modification
--------------------
1. Raccourcir les labels
   - « SAUVEGARDÉS » → « FAVORIS » (gain de largeur, plus court visuellement).
   - « MON COMPTE » → « COMPTE » (libère l’espace nécessaire pour rester lisible).
   - Garder « EXPLORER », « SORTIES » et « PROPOSER » inchangés.

2. Ajuster l’espacement horizontal
   - Réduire le padding horizontal des boutons de tab (`px-4` actuel) vers `px-2` ou `px-3` sur les petits écrans, via une classe responsive Tailwind.
   - Conserver une taille de cible tactile correcte (hauteur + zone cliquable suffisante).

3. Affiner la typographie si besoin
   - Conserver la taille de police actuelle (`text-[10px]`) pour la lisibilité.
   - Légèrement réduire le `tracking-wide` ou passer à `tracking-normal` uniquement si le gain de labels ne suffit pas.

4. Vérification
   - Tester le rendu sur viewport mobile (~390 px) pour s’assurer que les 5 labels sont entièrement visibles.
   - Vérifier que le badge de favoris reste bien positionné sur l’icône cœur.
   - Vérifier que les états actifs/inactifs et les navigations fonctionnent toujours.

Fichier concerné
----------------
- `src/components/BottomNav.tsx`

Aucune modification backend ni de route n’est nécessaire.