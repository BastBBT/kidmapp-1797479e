# Suivi du trafic par plateforme (web / iOS / Android)

Migration de base uniquement — aucun fichier du site n'est modifié.

## 1. Colonnes sur `page_views`
- `platform` text NOT NULL DEFAULT 'web', CHECK web/ios/android (historique = 'web')
- `app_version` text, CHECK longueur <= 32
- `device_id` uuid, `session_id` uuid (NULL pour l'historique)
- Index `page_views_platform_created_at_idx (platform, created_at DESC)`
- Policies RLS et purge 12 mois inchangées.

## 2. RPC `admin_audience_stats()` — CREATE OR REPLACE
Clés actuelles conservées à l'identique (même calcul, mêmes exclusions admins + compte bot), SECURITY DEFINER, `search_path = public`, check `is_admin`, REVOKE PUBLIC/anon + GRANT authenticated.

Nouvelles clés (exclusions appliquées, jours UTC) :
- `splitTrackingSince` : min(created_at) où session_id non NULL, sinon NULL
- `byPlatform30d` : `{web, ios, android}` toujours présents, chacun `sessions`, `uniques`, `loggedUniques`, `recurring` (user vu ≥ 2 jours distincts sur la plateforme)
- `daily7dByPlatform` : 7 jours × 3 plateformes (`sessions`, `uniques`), zéros générés via `generate_series` × liste des plateformes
- `appVersions30d` : `[{platform, version, uniques}]` pour ios/android avec version non NULL, trié platform puis uniques décroissant

## Hors périmètre
Pas de nouvelle table, pas de renommage, pas de changement à `admin_dashboard_stats`, pas de code front.

Je confirmerai avec le nom du fichier de migration généré.
