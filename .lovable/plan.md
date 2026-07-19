## Événements longue durée dans Sorties

Support des événements qui s'étalent sur plusieurs semaines (expos, festivals) : ils doivent apparaître dans chaque semaine traversée tant qu'ils ne sont pas terminés.

### 1. Fetch élargi — `src/hooks/useEvents.ts`
Modifier la requête pour inclure les events longue durée encore en cours :
- Condition : `date_start >= lundi_semaine_dernière` **OU** `date_end >= aujourd'hui`
- Garder `status = published`

### 2. Groupement par semaine — `src/pages/SortiesPage.tsx`
Un événement apparaît dans chaque semaine (lun→dim) qu'il traverse, entre `date_start` et `date_end` (ou `date_start` seul si pas de `date_end`).

Helper à ajouter dans `src/lib/weekend.ts` : `eventInWeek(event, weekStart, weekEnd)` qui vérifie le chevauchement d'intervalles.

### 3. Onglets semaines
Génération des chips :
- Toujours : « Semaine dernière », « Cette semaine »
- Semaines futures : uniquement celles où un événement **démarre** (`date_start` dans la semaine) — évite les onglets fantômes pour un festival qui a commencé il y a 2 mois.

### 4. Tri intra-semaine
Trier par `max(date_start, lundi_de_la_semaine_affichée)` — un event long ne reste pas figé en tête de liste chaque semaine ; il se positionne selon sa date effective dans la semaine courante.

### 5. Statut « Terminé »
Vérifier que `isPastEvent` dans `EventCard` et `EventPage` se base sur `date_end ?? date_start` — un event long n'est grisé que lorsque sa **fin** est passée, pas son début.

### Détails techniques

- `weekend.ts` : nouveau helper `eventInWeek(event, weekStartISO, weekEndISO)` → `event.date_start <= weekEnd && (event.date_end ?? event.date_start) >= weekStart`
- `SortiesPage.tsx` : remplacer le filtre `eventInWeek` actuel par le nouveau, adapter le tri (`sortKey = max(new Date(date_start), weekStart)`)
- `useEvents.ts` : `.or('date_start.gte.{lastMonday},date_end.gte.{today}')`
- Aucune migration DB nécessaire
