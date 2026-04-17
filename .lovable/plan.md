

## Ajouter une barre de recherche dans l'admin (Lieux, Contributions, Propositions)

### Objectif
Permettre de retrouver rapidement un élément dans chacun des 3 onglets de l'admin avec une recherche simple par texte.

### Champs de recherche

- **Lieux** : nom, adresse, website
- **Contributions** : nom du lieu associé (cherché via `locations.find(...)`)
- **Propositions** : nom, adresse, website

Recherche insensible à la casse, sans accents (filtrage côté client, immédiat).

### Implémentation — `src/pages/AdminPage.tsx`

**1. Ajouter 3 états de recherche** (au niveau du composant `AdminPage`) :
```tsx
const [searchLocations, setSearchLocations] = useState('');
const [searchContributions, setSearchContributions] = useState('');
```
(et un 3ème dans `ProposalsTab` pour `searchProposals`)

**2. Créer un petit composant inline réutilisable `SearchBar`** au-dessus de chaque liste — input avec icône loupe, style cohérent avec le reste de l'admin (border-radius 100px, fontFamily DM Sans, padding 10px).

**3. Filtrage** :
- **Lieux** (ligne 354) : remplacer `locations.map(...)` par `locations.filter(loc => match(loc.name, loc.address, loc.website)).map(...)`
- **Contributions** (ligne 449) : filtrer sur le nom du lieu trouvé via `locations.find(l => l.id === contrib.location_id)?.name`
- **Propositions** (ligne 1124, dans `ProposalsTab`) : filtrer sur `proposal.name`, `proposal.address`, `proposal.website`

**4. Helper de normalisation** :
```ts
const normalize = (s?: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const match = (q: string, ...fields: (string | undefined)[]) => 
  fields.some(f => normalize(f).includes(normalize(q)));
```

**5. UX** : afficher un message "Aucun résultat" quand le filtre ne renvoie rien, et un compteur discret du type "12 lieux affichés".

### Pas de changement BDD
Filtrage 100% côté client — les listes sont déjà chargées en mémoire.

