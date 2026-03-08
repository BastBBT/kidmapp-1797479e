
Cause probable (et visible dans le code actuel) :
- Dans `AdminPage.tsx`, le conteneur scroll a bien `className="... pb-32"`, mais il a aussi `style={{ padding: '16px 16px 0' }}`.
- Ce `padding` inline (shorthand) écrase le `pb-32`, donc le bas du formulaire n’a plus d’espace de sécurité au-dessus de la bottom nav fixe.
- Résultat côté UX : on a l’impression de ne pas pouvoir atteindre le bas (le contenu final est masqué/rogné).

Plan de correction
1) Corriger la hiérarchie de scroll de la page admin
- Mettre le conteneur principal en scroll vertical réel.
- Ajouter `min-h-0` sur les parents flex nécessaires pour autoriser le scroll interne.
- Conserver `overflow-y-auto` sur la zone d’onglet active.

2) Éviter le conflit `pb-32` vs `padding` inline
- Remplacer le `style={{ padding: '16px 16px 0' }}` par des classes dédiées (`px-4 pt-4 pb-32`) sur le même bloc.
- Garder `pb-32` effectif pour que le bouton final reste visible au-dessus de la bottom nav.

3) Vérifier qu’aucun parent ne bloque le scroll
- Confirmer qu’aucun wrapper parent de la page admin n’a `overflow: hidden` ou hauteur fixe bloquante.
- Garder uniquement les `overflow-hidden` locaux (preview image etc.) qui ne concernent pas le layout global.

4) Validation rapide après patch
- Aller sur `/admin` > onglet “Ajouter un lieu”.
- Scroller jusqu’au bouton submit : il doit être entièrement visible et cliquable.
- Vérifier sur viewport mobile (où le bug est le plus visible) que le bas n’est plus caché.

Détails techniques
- Le problème n’est pas le formulaire lui-même, mais le combo “bottom nav fixe + padding-bottom neutralisé par style inline”.
- En CSS, un `padding` inline shorthand prioritaire annule `padding-bottom` défini par classe utilitaire.
- En flex column, `min-h-0` est souvent indispensable pour que `overflow-y-auto` fonctionne correctement sur l’enfant scrollable.
