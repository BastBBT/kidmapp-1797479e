# Refonte de la page Admin

## 1. Correction des chiffres du dashboard

État réel en base (vérifié) :
- Contributions : 1 en attente / 4 validées / 6 rejetées
- Lieux internes : 91 publiés / 1 en attente / 2 dépubliés
- Propositions utilisateurs : 0 en attente / 46 approuvées / 3 rejetées

Le dashboard ne compte **pas** les propositions utilisateurs en attente, ce qui prête à confusion.

**Fix** :
- Ajout d'une carte « Propositions en attente » qui compte `location_proposals.status='pending'`.
- Renommage de la carte existante en « Lieux internes à valider » pour lever l'ambiguïté.
- Renommage de « Users actifs 30j » en « Nouveaux inscrits 30j ».

## 2. Audience — tracking mixte sans cookie

Table `page_views` (path, referrer, user_id nullable, created_at). Aucun identifiant persistant côté visiteur anonyme → pas de bandeau RGPD.

- Hook `usePageviewTracker` monté dans `App.tsx` : log 1 ligne par changement de route, `user_id` rempli uniquement si l'utilisateur est connecté.
- RLS : insert ouvert (anon + auth) ; select admin uniquement.

3 cartes « Audience » sur 30 j :
- **Visites** — total brut de toutes les lignes
- **Visiteurs connectés uniques** — distinct `user_id` non null
- **Visiteurs récurrents** — connectés avec ≥ 2 jours distincts de visite

## 3. Emails des contributeurs et proposants

`contributions` et `location_proposals` ne stockent que `user_id`. Les emails vivent dans `auth.users`.

- Edge function `admin-list-user-emails` (vérifie le JWT + `is_admin`, renvoie `{user_id: email}` via `auth.admin.listUsers`).
- Hook `useUserEmails(userIds[])` côté admin avec cache TanStack Query.
- Affichage de l'email sous le titre de chaque contribution / proposition, avec lien `mailto:`.

## 4. Modifier une proposition avant approbation

Aujourd'hui : « Approuver » (copie brute) ou « Rejeter ». Nouveau bouton **« Modifier & approuver »** sur chaque proposition `pending`.

- Au clic : bascule la carte en formulaire pré-rempli avec tous les champs (nom, catégorie, adresse, équipements, photo, site web, instagram, note, bookable).
- L'admin peut éditer librement, remplacer la photo (composant `PhotoUpload` existant).
- À la soumission :
  1. Upload de la nouvelle photo si modifiée.
  2. Géocodage de l'adresse (ou coordonnées manuelles si nécessaire).
  3. Insertion dans `locations` (statut `published`).
  4. Insertion des `location_meals` issus des `meal_types` portés par la proposition.
  5. Update `location_proposals.status='approved'` + trace des édits dans `metadata.admin_edits`.
- Bouton « Annuler » referme l'édition sans modifier le statut.

## Détails techniques

```text
+ migration: table page_views + RLS  [DÉJÀ APPLIQUÉE]
+ supabase/functions/admin-list-user-emails/index.ts
+ src/hooks/usePageviewTracker.ts
+ src/hooks/useUserEmails.ts
~ src/App.tsx                 (mount tracker)
~ src/pages/AdminPage.tsx
   - étendre `admin-stats` (proposals pending + page_views aggregates)
   - section "Audience" (3 cartes) + 5e carte propositions pending
   - emails dans Contributions & Propositions
   - <EditProposalForm /> inline dans ProposalsTab
```
