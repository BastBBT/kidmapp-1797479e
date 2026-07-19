## 1. Migration SQL — Contrainte CHECK sur `events.category`

Migration en un seul call :

```sql
UPDATE events SET category = 'Autre'
WHERE category IS NOT NULL
  AND category NOT IN ('Spectacle','Atelier','Festival','Fête','Marché','Exposition','Autre');

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('Spectacle','Atelier','Festival','Fête','Marché','Exposition','Autre'));
```

## 2. Ajout catégorie « Exposition »

Dans `src/types/event.ts` :
- Ajouter `'Exposition'` dans `EVENT_CATEGORIES` (avant `'Autre'`).
- Ajouter les mappings dans `CATEGORY_TOKENS` (`var(--event-exposition)`), `CATEGORY_HEX` (`#2F80B5`), `CATEGORY_EMOJI` (`🖼️`).
- Mettre à jour aussi l'emoji « Festival » → `🎪` (aligné sur la spec) et « Marché » → `🧺`, « Autre » → `📅`.

Dans `src/index.css` : ajouter le token CSS `--event-exposition: #2F80B5` à côté des autres event-*.

Les selects dans `ProposeEventModal.tsx` et `AdminPage.tsx` utilisent déjà `EVENT_CATEGORIES` (menu fermé), donc rien à faire en plus côté formulaires — la nouvelle valeur apparaît automatiquement.

## 3. Feature — Filtre par type d'événement dans Sorties

Nouveau composant `src/components/EventCategoryFilter.tsx` :
- Props : `available: string[]`, `selected: string | 'all'`, `onChange`.
- Rendu conditionnel : ne s'affiche que si `available.length >= 2`.
- Rangée scrollable horizontale, même style que les autres pills (border-radius 100px, hauteur ~28px), avec pill « Tous » en tête.
- Pill active : `background = eventCategoryHex(cat)`, `color: #fff`.
- Re-clic sur pill active → repasse à `'all'`.

Dans `src/pages/SortiesPage.tsx` :
- Nouvel état `selectedCategory: string | 'all'` (défaut `'all'`).
- Calculer `availableCategories` en `useMemo` sur `events` :
  - Ordre fixe pour les connues : `Spectacle, Atelier, Festival, Fête, Marché, Exposition` (dans l'ordre de présence).
  - Puis catégories inconnues triées alphabétiquement.
  - `Autre` toujours en dernier si présent.
- Rendre le filtre juste sous l'`AgeFilter` (dans le Header ou juste en dessous du Header dans la page — approche la plus simple : rendu direct dans la page, sous le titre/subtitle et avant le `WeekendPicker`, pour ne pas toucher au composant `Header` partagé).
- Ajouter le filtre catégorie au `filteredEvents` (combiné avec âge + semaine).
- Le filtre s'applique déjà naturellement à la carte (elle reçoit `filteredEvents`).
- Au changement de catégorie ou d'âge : ramener `selectedKey` sur `defaultKey` (première semaine non passée) — étendre le `useEffect` existant.
- Empty state : si `selectedAge !== 'all' || selectedCategory !== 'all'` → « Rien ne correspond à tes filtres pour le moment » ; sinon garder le texte actuel.

## Détails techniques

- Sous-titre et pills de semaine inchangés.
- Aucun changement backend hors la migration.
- La liste `EVENT_CATEGORIES` mise à jour couvre déjà la contrainte CHECK (formulaires alignés).
