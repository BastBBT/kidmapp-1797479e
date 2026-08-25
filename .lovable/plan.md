# Corriger les chiffres d'audience 30 jours du dashboard

## Ce que j'ai constaté

Les chiffres d'audience sont bien faux, et la cause est confirmée : le dashboard récupère les `page_views` **ligne par ligne** puis les compte côté navigateur. Or l'API limite chaque requête à 1000 lignes.

Vérification en base :

- Vues des 30 derniers jours : **5 503** → le dashboard n'en voit que 1 000
- Vues des 7 derniers jours : **1 123** → le graphique n'en voit que 1 000
- Visiteurs connectés uniques 30j (réel) : **89**

Tous les indicateurs dérivés sont donc faussés : Visites, Visiteurs connectés, Récurrents, % Actifs 30j, et les deux graphiques 7 jours (visites et visiteurs uniques). Les cartes « Inscrits » (378 profils) et « Nouveaux inscrits 30j » (98) restent sous la limite et sont justes.

## Correction proposée

Faire calculer les agrégats par la base plutôt que par le navigateur.

- Nouvelle fonction SQL `public.admin_audience_stats()`, réservée aux admins, qui renvoie en une fois :
  - visites 30j, visiteurs connectés uniques 30j, récurrents 30j (≥ 2 jours distincts)
  - série quotidienne des 7 derniers jours : visites et visiteurs uniques par jour
  - inscrits (hors admins et hors compte bot de sourcing) et nombre d'inscrits actifs sur 30j
- Exclusions faites directement en SQL : rôles `admin` et compte `bastien.boubat+event@gmail.com` (résolu depuis `auth.users`), cohérent avec le reste du dashboard.

## Détail technique

- Migration : `CREATE FUNCTION public.admin_audience_stats() RETURNS jsonb`, `SECURITY DEFINER`, `search_path = public`, garde `IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION`, `REVOKE ALL FROM public` / `GRANT EXECUTE TO authenticated`.
- `src/pages/AdminPage.tsx` (query `admin-stats`) : remplacer les fetch `page_views` 30j et 7j par un `supabase.rpc('admin_audience_stats')`, et alimenter `totalVisits30d`, `uniqueLoggedVisitors30d`, `recurringVisitors30d`, `totalRegistered`, `activePct30d`, `visitsLast7d`.
- `visitsChartData` et `uniqueVisitorsChartData` consomment désormais la série quotidienne pré-agrégée au lieu de recompter des lignes brutes.
- Contributions / propositions / profils restent en fetch direct (volumes < 1000), mais je passerai les compteurs de statut en `count` exact pour éviter le même piège quand ces tables grossiront.
