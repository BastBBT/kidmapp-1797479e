# Plan : Sorties par semaine (au lieu de week-end)

## Objectif
L'onglet **Sorties** regroupe les événements par **semaine** (lundi → dimanche) au lieu de week-end, pour inclure ateliers du mercredi + vacances scolaires. Aucun changement de schéma DB.

## Changements

### 1. `src/lib/weekend.ts` → ajouter helpers "semaine"
Sans supprimer l'existant (pour ne rien casser ailleurs, ex. `EventCard` réutilise `isPastEvent`), ajouter :
- `interface Week { key: string /* ISO lundi */, monday: Date, sunday: Date, label: string, past?: boolean }`
- `buildWeeks(count = 8, from = new Date(), includeLast = true): Week[]`
  - Calcule le lundi de la semaine courante
  - Inclut la semaine passée en tête si `includeLast`
  - Labels :
    - passée → `Semaine dernière`
    - semaine courante → `Cette semaine`
    - suivantes → `Semaine du {d MMM}` (ex. `Semaine du 27 juil.`) via `toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })` sur le lundi
- `currentWeekKey(from)` : ISO du lundi courant
- `eventInWeek(dateStart, dateEnd, week)` : overlap standard `[dateStart..dateEnd] ∩ [monday..sunday]`. Plus besoin de la logique "weekday-only rattaché au samedi suivant" — un événement du mercredi tombe naturellement dans sa semaine.
- `lastMondayISO` existant : inchangé, sert toujours de borne basse du fetch.

### 2. `src/components/WeekendPicker.tsx` → renommer/adapter
Le composant s'appuie déjà sur une interface générique `{ key, label, past }`. On garde son style (chip pointillé/gris pour past, vert pour actif futur, plein pour actif présent) et on le renomme mentalement "period picker" — pas besoin de renommer le fichier, on lui passe des `Week[]` typés comme `{ key, label, past }` (structural typing).
- Aucune modif de style requise ; le picker fonctionne tel quel.

### 3. `src/pages/SortiesPage.tsx`
- Remplacer `buildWeekends(8, new Date(), true)` par `buildWeeks(8, new Date(), true)`.
- Remplacer `eventInWeekend` par `eventInWeek`.
- Renommer les variables locales (`selectedWeekend` → `selectedWeek`, `isPastWeekend` → `isPastWeek`).
- Sous-titre : `Les événements kids, semaine après semaine`.
- Titre : `Sorties de la semaine` (au lieu de `Sorties du week-end`).
- Message vide : `Pas d'événement pour cette semaine ✦`.
- Default key : première semaine non passée (inchangé dans la logique).

### 4. Effets induits (déjà OK, à confirmer)
- `EventCard` avec `showPast={isPastWeek}` : passe le flag « past » basé sur `isPastEvent(date_start, date_end)` — donc dans « Cette semaine » (past=false), un event du mercredi consulté jeudi n'est PAS grisé côté liste. **Correction nécessaire** : passer `showPast` = true dès qu'on affiche la semaine courante ou passée, pour que les events déjà terminés apparaissent grisés « Terminé » **au sein de « Cette semaine »**. On passe donc `showPast={!selectedWeek?.future}` où `future` = semaine strictement à venir (monday > aujourd'hui). Concrètement : `showPast = selectedWeek.monday <= today` (semaine passée OU en cours).
- `EventPage` : `isPastEvent` déjà utilisé → carte feedback 👍/👎 s'affiche naturellement pour l'atelier de mercredi consulté jeudi. Aucun changement.

### 5. Non-changements
- Fetch `useEvents` : borne basse `lastMondayISO()` inchangée (couvre semaine passée + courantes + futures publiées).
- Schema DB : aucune migration.
- Filtre âge : inchangé.
- `AccountPage`, `SavedPage`, `AdminPage` : n'utilisent pas `buildWeekends`/`eventInWeekend`, non impactés.

## Fichiers modifiés
- `src/lib/weekend.ts` (ajouts)
- `src/pages/SortiesPage.tsx` (bascule semaines + textes + logique showPast)

## Détails techniques
- Lundi ISO calculé via `(dow + 6) % 7` jours à retrancher depuis un jour donné (dim=0 → 6 jours en arrière).
- Comparaison de dates via ISO string lexicographique (`YYYY-MM-DD`), déjà utilisée dans le fichier.
