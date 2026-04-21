

## Restaurer "kidmapp" en minuscules dans le hero Auth

D'après la capture d'écran fournie, le logo doit s'afficher **"kidmapp"** (tout en minuscules), avec la police Fraunces italic display déjà en place.

### Changement

**`src/components/AuthModal.tsx`** : remplacer le texte du logo dans le hero, de `Kidmapp` → `kidmapp`. Aucun autre changement (police, taille, couleur, variation settings restent identiques).

### Note

Les autres occurrences de "Kidmapp" dans l'app (Header de l'app, footer admin, titres) restent avec le K majuscule — la minuscule est spécifique au logo de marque dans le hero d'authentification, conformément à la capture.

