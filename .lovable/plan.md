# Compaction des filtres Explorer

Objectif : passer de 3 rangées + 3 libellés à 2 rangées.
- Rangée 1 : `[Lieux | Activités]` (segmented) + pills scrollables du groupe actif.
- Rangée 2 : `ÂGE` inline + pills capsule compactes.

## 1. `src/components/CategoryFilter.tsx`

Refactor complet du composant.

- Ajouter un state local `group: 'places' | 'activities'`.
  - Initialisation : si `selected` est dans `ACTIVITY_CATEGORIES` → `activities`, sinon `places` (y compris `all`).
  - `useEffect` qui resynchronise `group` si `selected` change vers un item de l'autre groupe (ex. sélection déclenchée ailleurs).
- Un composant `SegmentedControl` avec 2 boutons `Lieux` / `Activités` :
  - Piste : fond `#E7E3DC` (sable), `border-radius: 100px`, `padding: 3px`, hauteur ~30px, inline-flex.
  - Segment actif : fond `#fff`, texte `var(--text)` foncé, `font-weight: 600`, ombre légère `0 1px 2px rgba(0,0,0,.08)`.
  - Segment inactif : fond transparent, texte `var(--text-muted)`.
  - Point orange 6px (`background: var(--primary)`, `border-radius: 50%`) affiché en position absolue haut-droite du segment inactif si la catégorie sélectionnée appartient à l'autre groupe (et n'est pas `all`).
  - Police 12–13px, DM Sans.
- Layout rangée 1 : `flex items-center gap-2`, segmented à gauche (shrink-0), puis un conteneur scrollable horizontal contenant :
  - Pill `Tout` (toujours en tête, mappe sur `onChange('all')`, actif si `selected === 'all'`).
  - Les pills du groupe actif (`PLACE_CATEGORIES` ou `ACTIVITY_CATEGORIES`).
- Les `Pill` gardent leur style actuel (design system existant).
- Supprimer les `GroupLabel` "Lieux"/"Activités" et le séparateur vertical.
- Le composant n'expose plus qu'une seule rangée (au lieu de deux).

Changer le segment met à jour `group` seulement — ne modifie pas `selected`. La catégorie filtrée est donc conservée quand on bascule.

## 2. `src/components/AgeFilter.tsx`

- Remplacer le libellé Caveat `Âge :` par un label inline compact :
  - Texte `ÂGE`, `font-family: DM Sans`, `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.08em`, couleur `var(--text-muted)`.
- Les pills : conserver la forme capsule, `font-size: 12px`, `padding: 4px 10px`, taille naturelle.
- Conteneur : `display: inline-flex` (pas de largeur 100 %) ; wrapper parent reste en flex row auto pour ne pas s'étirer.

## 3. Vérifier le parent (Explorer)

- Aucun changement d'API : `CategoryFilter` et `AgeFilter` gardent la même signature de props. Le parent affiche déjà les deux composants ; le titre "Âge de l'enfant" au-dessus de `AgeFilter` (s'il existe dans la page Explorer) est retiré si présent, sinon rien à faire côté page.

## Détails techniques

- Point orange sur segment inactif : positionné absolument (`top: 2px; right: 6px`), z-index sur le segment ; le container segment doit être `position: relative`.
- Le state `group` vit dans `CategoryFilter` (pas remonté au parent) — évite tout changement d'API.
- Pas de nouveau token de couleur : `#E7E3DC` et `#fff` inline (aesthetic distinct des pills, volontaire pour lecture "switch de vue"), reste des couleurs via variables CSS existantes.
