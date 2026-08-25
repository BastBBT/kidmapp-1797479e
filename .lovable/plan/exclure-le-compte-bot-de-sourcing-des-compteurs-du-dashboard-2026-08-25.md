# Exclure le compte bot de sourcing des compteurs du dashboard

Le compte `bastien.boubat+event@gmail.com` est déjà exclu des stats d'audience (visites, visiteurs uniques, inscrits, acquisition), mais il compte encore dans les autres compteurs du dashboard.

## Ce qui reste à exclure

- Contributions (total et en attente)
- Propositions de lieux en attente
- Nouveaux inscrits sur 30 jours
- Contributions des 7 derniers jours (graphique)
- Top contributeurs (les deux classements)

Les onglets de modération (listes Lieux / Activités / Événements à valider) ne sont pas touchés : le contenu sourcé par le bot doit rester visible et validable, seul le comptage statistique change.

## Détail technique

- `src/pages/AdminPage.tsx`, requête `admin-stats` : remplacer les filtres `notAdmin(...)` par `notExcluded(...)` (qui inclut déjà les admins + le bot résolu par email) pour `contribs`, `proposals` et `daily`, et filtrer `newUsers` sur `excludedIds` en plus du rôle admin.
- `src/hooks/useTopContributors.ts` : le hook n'exclut aujourd'hui que les admins. Ajouter la résolution du compte bot via l'edge function `admin-list-user-emails` (même approche que `admin-stats`) et l'exclure des agrégats propositions/contributions.
- Constante `bastien.boubat+event@gmail.com` déjà présente dans `AdminPage.tsx` ; l'extraire dans un module partagé (ex. `src/lib/adminBot.ts`) pour être réutilisée par le hook.
