## Problème
Les PNG d'activités uploadés ont un canvas 1376×768 mais le dessin n'occupe que la zone centrale (~500×580 px), avec beaucoup de blanc autour. Les icônes « Lieux » existantes sont cadrées serré (canvas ≈ sujet). Rendues au même `width:15px` CSS, les activités apparaissent plus petites visuellement.

## Solution
Recadrer les 5 PNG d'activités sur leur bounding box (+ petite marge uniforme ~5%) avant re-upload, pour que le sujet remplisse le canvas comme les icônes Lieux.

## Étapes
1. Pour chaque fichier `/mnt/user-uploads/{nature,sport,creatif,culture,jeux}.png` :
   - Calculer la bbox non-blanche via PIL.
   - Ajouter ~5% de marge, cropper, sauvegarder dans `/tmp/cat-{name}.png`.
2. Supprimer les 5 pointeurs CDN actuels : `lovable-assets delete --file src/assets/cat-{name}.png.asset.json`.
3. Re-uploader les versions recadrées via `lovable-assets create --file /tmp/cat-{name}.png --filename cat-{name}.png` → réécrit `src/assets/cat-{name}.png.asset.json`.
4. Aucune modif de code nécessaire (`CATEGORY_ICONS` pointe déjà sur ces `.asset.json`).
5. Vérifier visuellement dans l'Explorer que les 5 icônes activités ont la même taille perçue que les icônes Lieux.

## Notes
- Le canvas d'origine reste blanc → pas de fond transparent nécessaire, comme les icônes Lieux.
- Le pointeur CDN est immutable ; on remplace donc le fichier `.asset.json` par le nouveau, l'ancien asset est supprimé.