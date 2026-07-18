## Objectif

Faire apparaître les propositions d'événements de l'utilisateur sur sa page **Compte**, avec leur statut (en attente / publié / refusé), au même titre que les contributions et les propositions de lieux.

## Constat

Dans `src/pages/AccountPage.tsx`, la query `myEvents` est déjà en place (ligne ~205) mais elle n'est jamais rendue dans l'UI. Résultat : un utilisateur qui propose un événement ne le retrouve nulle part dans son compte.

## Changements

Fichier unique : `src/pages/AccountPage.tsx`.

1. **Stats (bloc en haut)** — passer la grille de 3 à 4 colonnes et ajouter une tuile « Événements » = `myEvents.length`.

2. **Nouvelle section « Mes événements »** — insérée juste après « Mes propositions », même style visuel que la section propositions :
   - Miniature photo si `event.photo`, sinon `CategoryThumb` avec l'emoji catégorie événement (via `eventCategoryEmoji` depuis `@/types/event`).
   - Nom de l'événement (Fraunces).
   - Date formatée (`date_start`, + `→ date_end` si présent).
   - Adresse en petit si dispo.
   - Badge de statut à droite avec la même palette que les propositions :
     - `published` → vert « ✓ Publié » + pastille « +25 pts »
     - `rejected` → rouge « ✗ Refusé »
     - `pending` (ou autre) → jaune « ⏳ En attente »
   - Empty state : « Tu n'as pas encore proposé d'événement ✦ ».

3. Aucun changement backend, aucune modification hors de ce fichier.

## Détails techniques

- Type des événements : réutiliser `EventItem` via `data as any[]` déjà en place — pas de refactor de la query.
- Import ajouté : `eventCategoryEmoji` depuis `@/types/event`.
- Grille stats : `gridTemplateColumns: 'repeat(4, 1fr)'` pour rester lisible en mobile 390px.
