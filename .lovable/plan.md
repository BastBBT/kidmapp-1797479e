## Objectif

Permettre à l'admin d'ajouter un message explicatif lors du refus d'une contribution, proposition de lieu, ou événement/activité. Ce message est envoyé par email au proposeur, avec `reply-to: hello@kidmap.app` pour qu'il puisse répondre.

## Flux utilisateur (admin)

Aujourd'hui : clic sur "Rejeter" → statut passe à `rejected` immédiatement, aucune notification.

Nouveau : clic sur "Rejeter" → une modale s'ouvre avec :
- Le nom de la contribution/proposition/événement concerné
- Un `textarea` "Motif du refus (envoyé à l'utilisateur)" — optionnel
- Un bouton "Confirmer le refus" et "Annuler"

À la confirmation :
1. Le statut passe à `rejected` (comportement actuel conservé).
2. Si le proposeur a un `user_id` ET un email récupérable, un email est envoyé avec le motif.
3. Toast de succès mentionnant l'envoi ou non de l'email.

Le champ motif est optionnel : si vide, aucun email n'est envoyé (rejet silencieux, comme aujourd'hui).

## Email

Nouveau template `submission-rejected` (React Email, cohérent avec `proposal-approved` et `event-published`) :
- Titre : "Ton [lieu/événement/contribution] n'a pas été retenu"
- Nom de la soumission
- Bloc "Message de l'équipe Kidmapp" affichant le motif saisi
- Texte : "Tu peux nous répondre directement à hello@kidmapp.app si tu veux en discuter."
- Pas de CTA (ou un CTA discret vers la page Compte)
- `reply-to: hello@kidmapp.app` (via un nouveau paramètre optionnel `replyTo` dans `send-transactional-email`)

Un seul template couvre les trois types (contribution / proposition / événement) via un prop `submissionType` qui adapte le titre.

## Détails techniques

**Frontend — `src/pages/AdminPage.tsx`**
- Nouveau composant local `RejectDialog` (ou réutilisation de `Dialog` shadcn) avec state `{ open, target, type, reason }`.
- Refactor des trois `handleReject` (contributions ligne 362, proposals ligne 2351, events ligne 2794) pour :
  1. Ouvrir la modale au lieu de rejeter directement.
  2. Une fois confirmé, appliquer l'update `status: 'rejected'` puis appeler `supabase.functions.invoke('send-transactional-email', ...)` si motif fourni.
- Récupération de l'email du proposeur : réutiliser le hook existant `useUserEmails` déjà utilisé côté admin (proposals/events). Pour les contributions, ajouter la même récupération si absente.

**Backend — `supabase/functions/send-transactional-email/index.ts`**
- Ajouter le support d'un champ optionnel `replyTo` dans le payload et le passer à Mailgun (`h:Reply-To`).

**Nouveau template — `supabase/functions/_shared/transactional-email-templates/submission-rejected.tsx`**
- Props : `submissionType: 'contribution' | 'location' | 'event'`, `submissionName: string`, `reason: string`.
- Enregistré dans `registry.ts`.

**Déploiement** : `send-transactional-email` (modif payload).

## Hors scope

- Pas de trigger DB automatique : l'envoi est piloté depuis l'admin uniquement (sinon on ne connaît pas le motif).
- Pas de champ persistant `rejection_reason` en base pour l'instant (peut être ajouté plus tard si besoin d'historique).