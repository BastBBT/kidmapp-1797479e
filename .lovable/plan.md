## Objectif

Sur la fiche lieu, exposer les contributions validées : compteurs ✓/✗ par équipement, badge "N familles", et nouvelle section avec les avis récents (prénom + date relative + chips équipements + commentaire).

## Migration (RLS uniquement)

`profiles.full_name` existe déjà — on skip l'ajout de colonne.

1. **RLS `contributions`** — nouvelle policy `contributions_select_validated_public` : `FOR SELECT USING (status = 'validated')`. Permet l'agrégation des votes et l'affichage des avis publics.
2. **RLS `profiles`** — nouvelle policy `profiles_select_public_basic FOR SELECT USING (true)` pour joindre `full_name` à l'auteur d'une contribution validée. La table ne contient pas de PII sensible (juste `id`, `role`, `full_name`, `created_at`).

## Nouveau hook : `useLocationContributions(locationId)`

Fichier : `src/hooks/useLocationContributions.ts`

- Query TanStack : `contributions` filtré sur `location_id` + `status = 'validated'`, joint `profiles(full_name)`, trié `created_at DESC`.
- Retourne `{ contributions, votes, commentCount, contributorCount }` :
  - `votes`: `{ high_chair: {yes, no}, changing_table: {yes,no}, kids_area: {yes,no}, kids_menu: {yes,no}, bookable_yes }`.
  - `contributorCount`: nb de `user_id` distincts.
  - `commentCount`: nb de contributions avec `content` non vide.
- Remplace `useEquipmentVotes` sur `LocationPage` (consolidation, on garde le hook existant si utilisé ailleurs).

## UI — `src/pages/LocationPage.tsx`

### Section "Équipements enfants"

- Header de section : titre à gauche, **badge pill** terracotta clair à droite : `N famille{s}` (visible si `contributorCount > 0`). Style : `background: rgba(217,95,59,0.12); color: var(--primary); border-radius: 100px; padding: 4px 10px; font-size: 12px`.
- Sous chaque pill équipement actif, remplacer le compteur unique `✓ N` par **mini-pills compacts** :
  - `X ✓` — `background: #EBF6EC; color: #2E7D32`
  - `X ✗` — `background: #F2F2F2; color: #6B6B6B; border: 1px solid var(--border)`
  - Affichés uniquement si > 0.
- Si aucun équipement n'est marqué `true` sur le lieu mais que des votes existent, on liste quand même les équipements votés avec leurs mini-pills.

### Nouveau composant : `LocationContributionsSection`

Fichier : `src/components/LocationContributionsSection.tsx`

- Props : `locationId: string`.
- Utilise `useLocationContributions`. Ne rend rien si aucune contribution validée.
- Header : `h2` "Ce que disent les familles" + pill terracotta `{commentCount} avis` (si > 0).
- Liste : 3 cartes max (les plus récentes).
- Carte :
  - Ligne 1 : avatar circulaire 36px (`background: var(--accent-light)`, initiale du prénom ou icône famille) + prénom (premier mot de `full_name`, fallback "Une famille") + `·` + date relative FR (Aujourd'hui / Hier / Il y a N jours / Il y a N semaines / Il y a N mois).
  - Ligne 2 : chips équipements renseignés : carré 24px icône (`EQUIP_ICONS`) + ✓ (vert) ou ✗ (gris).
  - Ligne 3 (si `content`) : texte italique entre guillemets, `font-family: Caveat, fontSize: 16px`.
- Style carte : `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 10px`.
- Insérée dans `LocationPage` après le bloc `Bookable` / avant `LocationServicesSection`.

### Helper

`src/lib/relativeDate.ts` — formate une date en français relatif.

## Hors scope

- Formulaire d'édition de `full_name` (les avis sans valeur affichent "Une famille").
- Pagination ou "voir plus d'avis" (limite stricte à 3).

## Fichiers touchés

- Migration SQL (2 policies uniquement).
- `src/hooks/useLocationContributions.ts` (nouveau).
- `src/components/LocationContributionsSection.tsx` (nouveau).
- `src/lib/relativeDate.ts` (nouveau).
- `src/pages/LocationPage.tsx` (badge familles, mini-pills ✓/✗, intégration section).
