## Ajouter l'upload d'une photo dans l'édition d'événement (admin)

Dans l'onglet « Événements » de l'admin, le formulaire d'édition ne propose actuellement qu'un champ « Photo URL ». On y ajoute la possibilité de téléverser une image depuis l'appareil, à côté du champ URL (l'un OU l'autre — pas obligatoire).

### Comportement
- Bouton « Choisir une photo » (input file, `accept="image/*"`) + aperçu miniature de l'image sélectionnée.
- Le champ URL reste éditable (utile pour du sourcing avec URL externe).
- À l'enregistrement (`saveEdit`) :
  - Si un fichier a été sélectionné, on l'upload dans le bucket `location-photos` (déjà public, déjà utilisé pour les lieux) sous le préfixe `events/<eventId>-<timestamp>.<ext>`, puis on prend la `publicUrl` comme valeur de `photo`.
  - Sinon, on garde la valeur du champ URL (comme aujourd'hui).
  - Si un fichier est uploadé ET que la photo précédente pointait vers ce même bucket, on supprime l'ancien objet (comme pour les lieux).
- Toast d'erreur en cas d'échec d'upload, l'update Postgres n'est pas envoyé.

### Fichier touché
- `src/pages/AdminPage.tsx` — dans `EventsTab` :
  - États locaux `photoFile` / `photoPreview` réinitialisés à l'ouverture et à la fermeture de l'édition.
  - UI d'upload insérée juste au-dessus du champ « Photo URL » dans le bloc édition.
  - Logique d'upload/suppression ajoutée en tête de `saveEdit`.

Aucun changement de schéma ni de policy — le bucket `location-photos` est déjà public et writable par les authenticated users.