## Objectif
Enrichir la section **Audience** du dashboard admin (`/gestion-k1dm4p`) :
1. Graphique **Visiteurs uniques — 7 derniers jours** sous le graphique **Visites**, même format (barres, ~96px, DM Sans).
2. Deux nouvelles stats :
   - **Inscrits** : nombre total de profils non-admin.
   - **Actifs 30j (%)** : part de ces inscrits ayant au moins un `page_view` sur les 30 derniers jours.
3. **Exclure `bastien.boubat+event@gmail.com`** (bot de sourcing interne) de toutes les stats Audience.

## Définition « visiteur unique »
Anonymes non identifiables → l'unicité porte sur les visiteurs **connectés** : distinct `user_id` par jour (admins + compte bot exclus). Libellé : **« Visiteurs uniques (connectés) — 7 derniers jours »**.

## Changements

### `src/pages/AdminPage.tsx` — `queryFn` de `admin-stats`
- Récupérer l'id du compte bot via `admin-list-user-emails` (déjà utilisé ailleurs) OU plus simple : ajouter une requête `profiles` sur `full_name`/email… Comme `profiles` n'a pas l'email, faire un appel à l'edge function `admin-list-user-emails` pour retrouver l'id correspondant à `bastien.boubat+event@gmail.com`, puis l'ajouter à un set `excludedIds` = `adminIds ∪ { botId }`.
- Remplacer `adminIds` par `excludedIds` partout où on filtre les stats **Audience** (`views`, `views7d`, `loggedInUsers`, `recurring`, acquisition, inscrits, actifs). Ne pas toucher aux autres onglets (contributions/proposals restent filtrés uniquement sur admins pour ne pas modifier le comportement demandé).
- Ajouter `supabase.from('profiles').select('id, role')` au `Promise.all` pour compter `totalRegistered` (hors `excludedIds`).
- Calculer `activeUserIds30d` = distinct `user_id` non-null de `views` (déjà filtrées).
- `activePct30d = totalRegistered > 0 ? Math.round(activeUserIds30d.size / totalRegistered * 100) : 0`.

### `visitsChartData` (~ligne 244)
Ajouter en parallèle `uniqueVisitorsChartData` : pour chacun des 7 derniers jours, compter les `user_id` distincts non-null parmi `stats.visitsLast7d`.

### Rendu (~ligne 681)
- Grille `StatCard` : passer à **5 tuiles** sur 2 lignes (`gridTemplateColumns: '1fr 1fr'` mobile) :
  Visites / Visiteurs connectés / Récurrents / **Inscrits** / **Actifs 30j** (`sub="{activePct30d}%"`).
- Après le bloc « Visites — 7 derniers jours » (~ligne 710), insérer un bloc identique **« Visiteurs uniques — 7 derniers jours »** avec `uniqueVisitorsChartData`, style identique (couleur `var(--primary)` pour différencier du bloc visites brutes).

### Notes techniques
- Aucune migration DB.
- Compte bot résolu à la volée côté client via `admin-list-user-emails` (déjà accessible aux admins). Si l'appel échoue, fallback silencieux → `excludedIds = adminIds` seul.
- Pas de changement du weekly admin report ni de `usePageviewTracker`.

## Hors périmètre
- Weekly report inchangé.
- Pas de tracking d'anonymes uniques (pas d'IP/fingerprint).
