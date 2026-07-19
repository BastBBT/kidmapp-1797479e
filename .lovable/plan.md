## Bouton "Ouvrir le lien" dans l'admin Événements

Dans l'onglet Événements de l'admin, ajouter un bouton qui ouvre `ev.website` dans un nouvel onglet pour vérifier l'événement avant approbation.

### Emplacement
`src/pages/AdminPage.tsx`, dans la rangée d'actions de chaque carte événement (vers L3175-3198).

### Comportement
- Bouton **"↗ Voir le lien"** affiché **uniquement si `ev.website`** est renseigné.
- Placé en premier dans la rangée (avant Approuver) quand `status === 'pending'`, sinon avant Modifier.
- `<a href={ev.website} target="_blank" rel="noopener noreferrer">` stylé comme les autres pills (flex 1 1 30%, bordure accent).
- `onClick` stopPropagation pour ne pas déclencher d'autre action.

Aucune autre modification (pas de changement de logique, de data, ou d'autres onglets).
