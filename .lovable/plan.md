# Edge function `extract-event-from-image`

Nouvelle fonction serveur qui reçoit une capture d'écran d'événement et renvoie les champs extraits en JSON, prêts à préremplir le formulaire admin. Aucune écriture en base, aucune migration, aucun changement d'UI pour l'instant.

## Comportement

Entrée (POST JSON) : `imageBase64` (sans préfixe `data:`) + `mimeType` (`image/jpeg`, `image/png`, `image/webp`).

Sortie : JSON avec `name` (requis) et tous les autres champs nullables — `category`, `address`, `date_start`, `date_end`, `time`, `age_min`, `age_max`, `duration`, `weather`, `price`, `website`, `instagram`, `note`. Si l'image ne contient pas d'événement lisible : `{ "error": "raison courte" }`.

Règles appliquées côté modèle et revérifiées côté serveur :
- `category` strictement parmi Spectacle / Atelier / Festival / Fête / Marché / Exposition / Autre (sinon « Autre »).
- `weather` strictement parmi En intérieur / En extérieur / Les deux, sinon `null`.
- `date_start` = date la plus proche/pertinente ; les créneaux multiples sont décrits en texte libre dans `note`.
- Aucune valeur inventée : champ absent de l'image ⇒ `null`.

## Sécurité

Accès réservé aux admins : vérification du Bearer token via `auth.getUser`, puis RPC `is_admin` — même schéma que `admin-list-user-emails`. Validation Zod du corps de requête (mimeType autorisé, taille max de l'image ~8 Mo en base64), 400 sinon.

## Détails techniques

- Fichier : `supabase/functions/extract-event-from-image/index.ts`, CORS complet (OPTIONS + toutes les réponses).
- Appel AI Gateway Lovable (`LOVABLE_API_KEY` déjà présent) sur `/v1/chat/completions`, modèle `google/gemini-3.7-flash`, image passée en bloc `image_url` avec data URL base64, `response_format: json_object`.
- Gestion d'erreurs gateway : 429 et 402 relayés tels quels avec message explicite, autres erreurs en 502.
- Normalisation du JSON renvoyé par le modèle : coercition des enums, parsing des dates au format `YYYY-MM-DD`, heure `HH:MM`, âges en entiers, chaînes vides ⇒ `null`.
- Pas d'entrée dans `supabase/config.toml` (verify_jwt = false par défaut, auth validée dans le code).
- Test de la fonction après déploiement avec une image d'exemple pour vérifier la réponse.
