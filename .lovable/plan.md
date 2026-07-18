## Objectif
Envoyer un email quand un événement passe au statut `published`, en réutilisant le design du template `proposal-approved`.

## 1. Nouveau template `event-published.tsx`

Fichier : `supabase/functions/_shared/transactional-email-templates/event-published.tsx`

- Structure/style copiés à l'identique de `proposal-approved.tsx` (header, card, hero, CTA vert, footer).
- Props : `userName`, `eventTitle`, `eventId`, `eventCategory`, `eventStartDate` (optionnel).
- Hero : bulle icône calendrier `📅`, headline « Ton événement est en ligne ! ».
- Badge : `{emoji catégorie} {eventTitle}` avec la palette activités (nature/sport/creatif/culture/jeux) déjà utilisée dans l'app.
- Paragraphe : mention du titre + date formatée en français si dispo.
- CTA : « Voir l'événement → » vers `${SITE_URL}/event/${eventId}`.
- Subject dynamique : `📅 {eventTitle} est en ligne sur Kidmapp`.

Enregistrer dans `registry.ts` sous la clé `event-published`.

## 2. Étendre `notify-validation/index.ts`

Ajouter `'event'` aux types acceptés :
- Validation du body : `['contribution', 'proposal', 'event']`.
- Branche `type === 'event'` :
  - lit `events` (`user_id, title, category, start_date`)
  - `templateName = 'event-published'`
  - `templateData = { userName, eventTitle, eventId, eventCategory, eventStartDate }`
  - `idempotencyKey = event-{recordId}`

## 3. Trigger DB

Migration ajoutant :
- Fonction `public.on_event_published()` (miroir de `on_proposal_approved`) qui appelle `notify_validation_async('event', NEW.id)` quand `NEW.status = 'published'` et `OLD.status <> 'published'` et `NEW.user_id IS NOT NULL`.
- Trigger `AFTER UPDATE OF status ON public.events` qui exécute cette fonction.
- Aucun changement de schéma, aucune RLS/GRANT à ajouter (table existante).

Le trigger existant `events_award_points` reste indépendant — les deux triggers coexistent sans conflit.

## 4. Déploiement
- Déployer les edge functions `send-transactional-email` et `notify-validation` (nouvelle version).
- Le template est chargé automatiquement via le registry.

## Cas hors périmètre
- Les événements créés par un admin ou par le compte de sourcing `bastien.boubat+event@gmail.com` déclencheront quand même l'email si `user_id` correspond à un utilisateur avec email valide — comportement identique aux propositions actuelles. Aucun filtre spécifique ajouté (à préciser si tu veux exclure le compte de sourcing).