# Suivi des clics vers les sites web (lieux, activités, événements)

Objectif : savoir quelles fiches génèrent des visites vers le site officiel de l'établissement, et l'afficher dans l'admin.

## 1. Nouvelle table `link_clicks`

Un enregistrement par clic sur le lien « site web » d'un lieu, d'une activité ou d'un événement (uniquement le champ `website` — ni Instagram, ni les reels).

Colonnes : `id`, `entity_type` ('location' ou 'event'), `entity_id`, `category` (catégorie du lieu au moment du clic, vide pour un événement), `url`, `platform` ('ios' / 'android' / 'web'), `user_id` (vide si visiteur non connecté), `created_at`.

Règles d'accès (même schéma que le suivi de pages existant) :
- tout le monde, connecté ou non, peut enregistrer un clic ; un clic ne peut être attribué qu'à soi-même
- seuls les admins peuvent consulter les données

Index sur la date et sur le couple type/identifiant.

## 2. Fonction de statistiques `admin_link_clicks_stats(p_days)`

Réservée aux admins (même garde interne que les stats du dashboard). Pour la période demandée (30 jours ou ~180 jours), elle renvoie une ligne par fiche cliquée : type, identifiant, nom, catégorie, adresse du site, nombre de clics — triées par nombre de clics décroissant, 50 lignes maximum.

## 3. Enregistrement des clics côté web

Sur la fiche d'un lieu/activité et sur la fiche d'un événement, le bouton « site web » enregistre le clic avant d'ouvrir le lien (`platform` = 'web'). L'enregistrement est silencieux : s'il échoue, l'ouverture du lien se fait quand même. Les applications iOS/Android enregistreront leurs propres clics avec la même table.

## 4. Nouvel onglet admin « Trafic sortant »

Ajouté à côté des onglets existants. Il contient :
- un sélecteur de période : 30 derniers jours / 6 derniers mois
- en haut, trois compteurs de clics totaux (lieux / activités / événements) au format des tuiles du dashboard actuel
- trois classements séparés : lieux, activités, événements. Chaque ligne affiche le nom, le nombre de clics et un lien vers la fiche admin correspondante.

La séparation lieux / activités réutilise la catégorisation déjà en place dans l'app (helper `isActivity` de `src/types/location.ts`), sans redéfinir la liste des catégories.

## Détails techniques

- Migration : `CREATE TABLE public.link_clicks` + `GRANT INSERT` à `anon`/`authenticated`, `GRANT SELECT` à `authenticated` (policy admin), `GRANT ALL` à `service_role`, puis RLS et policies (insert avec `user_id IS NULL OR user_id = auth.uid()`, select `is_admin(auth.uid())`). Index `idx_link_clicks_created_at` et `idx_link_clicks_entity`.
- RPC `admin_link_clicks_stats(p_days integer default 30)` en `SECURITY DEFINER`, `SET search_path = public`, `RAISE EXCEPTION` si non admin, `REVOKE ALL ... FROM public, anon`, `GRANT EXECUTE TO authenticated`. Jointure sur `locations.name` / `events.name` (colonne réelle : `name`).
- Front : nouveau helper `src/lib/trackLinkClick.ts` (insert « fire and forget »), appelé depuis `LocationPage.tsx` et `EventPage.tsx` sur le lien `website` ; nouveau hook `useLinkClicksStats(days)` (TanStack Query) ; nouvel onglet `outbound` dans `AdminPage.tsx` réutilisant `StatCard`.
