## Rattacher les événements en semaine au week-end suivant

Aujourd'hui, `eventInWeekend` (dans `src/lib/weekend.ts`) fait un simple test de chevauchement de plages : un event dont la plage `[date_start, date_end]` ne touche pas samedi/dimanche est exclu du picker. Un event mono-jour un lundi ou mardi disparaît donc de la page Sorties.

### Règle à ajouter
Un événement dont **la période entière tombe en semaine (Lun–Ven)** est rattaché au samedi qui suit immédiatement `date_end` (ou `date_start` si pas de fin) — donc il apparaît uniquement dans **un seul** week-end du picker : le prochain.

### Cas couverts
- Event lundi seul → apparaît dans le week-end de la même semaine.
- Event mardi→jeudi → même week-end.
- Event vendredi seul → même week-end (le samedi juste après).
- Event qui chevauche déjà un samedi ou dimanche → comportement inchangé (règle actuelle d'overlap).
- Event dans un passé lointain → toujours filtré par `isPastEvent`.

### Changement
- `src/lib/weekend.ts` — modifier `eventInWeekend` :
  1. Calculer si la période `[start, end]` est entièrement Lun–Ven (aucune date Sat/Sun dans l'intervalle).
  2. Si oui : trouver le samedi suivant strictement `end`, comparer sa date ISO à `weekend.saturday` → match si égalité.
  3. Sinon : garder le test d'overlap existant.

Aucun autre fichier n'est touché — `SortiesPage` consomme déjà `eventInWeekend`.