# Restaurer les textes de l'assistant mascotte

## Constat

La même fusion qui avait supprimé la mascotte a aussi supprimé tout le bloc de textes `assistant` des trois fichiers de langue (français, anglais, espagnol). Résultat : l'assistant affiche les noms techniques des textes (`assistant.question_need`, `assistant.need_meal_title`, …) au lieu des vraies phrases, exactement comme sur la capture.

Vérifié : les 37 textes utilisés par l'assistant sont absents des trois fichiers actuels, et tous les 37 existent dans la version d'avant la fusion, dans les trois langues.

## Correction

Réinsérer le bloc `assistant` (37 textes) dans les trois fichiers de langue, repris tel quel de la version d'avant la fusion :

- français, anglais, espagnol
- aucun autre texte touché : les blocs existants restent identiques, on ajoute seulement le bloc manquant
- couvre les questions, les indices, les libellés d'étapes, les options (activités, repas, plein air, météo, durée, sans préférence), le bouton retour, l'option « échappée », le texte alternatif de la mascotte et le libellé du bouton dans l'en-tête

Ensuite : vérifier la compilation et contrôler visuellement que l'assistant affiche bien des phrases en français.

## Détails techniques

Fichiers modifiés : `src/i18n/locales/fr.json`, `en.json`, `es.json`. Source : bloc `assistant` du commit `fa4d1d7`. Aucun changement de code React nécessaire — `Assistant.tsx` et `Header.tsx` référencent déjà ces clés.
