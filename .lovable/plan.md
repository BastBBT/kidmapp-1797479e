# Graphiques 7 jours vides (onglet Audience) + audit des chiffres de l'admin

## Cause confirmée
Des données existent bien sur 7 jours (web 831 lignes, Android 71, iOS 66). Le problème vient du calcul en base `admin_audience_stats` : la série jour par plateforme utilise comme clé une date au format `2026-10-01 00:00:00+00`, alors que l'écran cherche `2026-10-01`. Aucun jour ne correspond, donc les barres sont toutes à 0.

Les deux autres séries jour par jour (visites globales, contributions du dashboard) utilisent déjà le bon format : elles ne sont pas touchées.

## Correction
Une migration (`supabase/migrations/`) qui remplace `admin_audience_stats` à l'identique, sauf la clé du jour : `g.day::date::text` au lieu de `g.day::text`. Mêmes clés, calculs, exclusions, SECURITY DEFINER, `search_path`, check `is_admin`, REVOKE/GRANT. Aucun fichier `src/` modifié.

## Audit complet des chiffres
Ensuite, je compare chaque chiffre affiché dans l'admin à un comptage direct en base (mêmes exclusions admins + compte bot) :
- Dashboard : lieux (total/publiés/en attente), contributions + graphique 7 jours, propositions, événements en attente (+ bot), nouveaux inscrits, répartition d'acquisition.
- Audience : répartition par plateforme (pages vues, sessions, uniques), connectés, récurrents, % actifs, inscrits, versions des apps.
- Engagement : compteurs de `admin_engagement_stats`.
- Trafic sortant : totaux de `admin_link_clicks_stats` (30 j / 6 mois).
- Vérification visuelle en me connectant en admin dans la prévisualisation.

Tout écart trouvé sera listé dans ma réponse ; les corrections simples et sûres (même type de bug de format ou de clé) seront faites dans la même migration, les autres te seront proposées avant d'y toucher.
