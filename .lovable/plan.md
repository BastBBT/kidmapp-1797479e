## Objectif
Décaler le bouton "Proposer" de sa position actuelle (après les 3 onglets) pour le placer entre "Explorer" et "Sauvegardés".

## Changement technique
Dans `src/components/BottomNav.tsx`, restructurer le rendu pour que l'ordre des 4 éléments soit :

```text
[Explorer] [+ Proposer] [Sauvegardés] [Mon compte]
```

Au lieu de mapper sur le tableau `tabs` puis d'ajouter le bouton Proposer en dur à la fin, on insère le bouton Proposer entre l'onglet "explore" et l'onglet "saved". Le plus simple est de mapper sur un tableau ordonné incluant le bouton Proposer au bon index, ou de diviser le rendu en deux parties séparées par le bouton Proposer.

## Fichier concerné
- `src/components/BottomNav.tsx` — réorganisation du JSX uniquement, aucune logique métier modifiée.