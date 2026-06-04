## Objectif

Ajouter dans l'onglet "Dashboard" de l'admin un mini-graphe "Visites — 7 derniers jours", placé **juste au-dessus** du graphe existant "Contributions — 7 derniers jours", avec le même style visuel (barres verticales, hauteur 80px, libellés jours sous chaque barre).

## Données

Dans `src/pages/AdminPage.tsx`, dans la query `admin-stats` (vers la ligne 154) :
- Ajouter un fetch parallèle `viewsLast7dRes` : `supabase.from('page_views').select('user_id, created_at').gte('created_at', <il y a 7 jours>)`.
- Filtrer pour exclure les visites des admins (`notAdminOrAnon`), comme pour `views` 30j.
- Retourner `visitsLast7d: viewsFiltered` dans l'objet stats.

## Chart data

Ajouter un second `useMemo` `visitsChartData` calqué sur `chartData` (lignes 201-211) qui agrège `stats?.visitsLast7d` par jour via `getLast7Days()` / `getDayLabel()`.

## Rendu

Dans le bloc dashboard (autour ligne 573), **avant** la div "Mini chart" contributions, insérer une div identique :
- Même conteneur (`background: var(--surface)`, `border-radius: var(--radius)`, `padding: 16px`, `box-shadow: var(--shadow)`, `margin-bottom: 12px`).
- Titre Caveat : `Visites — 7 derniers jours`.
- Même boucle de barres mais utilisant `visitsChartData` et couleur `var(--accent)` (vert) pour différencier visuellement du graphe contributions (terracotta).

## Hors scope

- Pas de modifications BDD / RLS (la policy `page_views_select_admin` existe déjà).
- Pas de séparation visiteurs connectés vs anonymes dans le graphe (compte brut, comme `totalVisits30d`).

## Fichier touché

- `src/pages/AdminPage.tsx` uniquement.
