## Problème

Sur la fiche d'un lieu, le pin de la carte est placé à partir de deux coordonnées stockées en base : `lat` (latitude) et `lng` (longitude). Le champ « Adresse » est juste du texte affiché — il n'a aucun effet sur la position du pin.

Aujourd'hui, le formulaire **Création** d'un lieu dans l'admin convertit automatiquement l'adresse en coordonnées (via OpenStreetMap/Nominatim), et propose un fallback manuel si la conversion échoue. Mais le formulaire **Modification** ne fait ni l'un ni l'autre : il enregistre la nouvelle adresse texte et laisse les coordonnées intactes. Résultat : le pin ne bouge jamais quand tu modifies l'adresse.

## Ce qu'on va faire

Aligner l'édition sur la création, dans la modale « Modifier le lieu » :

1. **Re-géocodage automatique si l'adresse a changé**
   À l'enregistrement, si la nouvelle adresse est différente de l'ancienne, on relance Nominatim pour obtenir de nouvelles coordonnées et on les enregistre avec le reste.

2. **Fallback coordonnées manuelles**
   Si Nominatim ne trouve rien (ou retourne un point hors de la zone Nantes), on affiche deux petits champs « Latitude » / « Longitude » pré-remplis avec les coordonnées actuelles. L'admin peut les corriger à la main et valider.

3. **Affichage des coordonnées actuelles**
   Sous le champ « Adresse », on affiche en petit `📍 47.1984, -1.5536` pour que tu voies tout de suite où est placé le pin, et un lien « Modifier manuellement » qui ouvre les champs lat/lng même quand le géocodage a réussi (utile si Nominatim choisit le mauvais bâtiment).

4. **Rafraîchissement de la carte côté app**
   Après l'enregistrement, on invalide les caches React Query (`['locations']`, `['all-locations']`, `['location', id]`) pour que la carte affiche immédiatement la nouvelle position sans avoir à recharger la page.

## Hors scope

- Pas de Realtime Supabase pour propager les changements aux autres visiteurs en direct (on peut l'ajouter dans un second temps si tu veux).
- Pas de carte mini-preview dans la modale d'édition pour cliquer-déplacer le pin (gros chantier, à proposer séparément).
- Aucun changement à la création, aux propositions utilisateurs, à la base de données ou aux RLS.

## Détails techniques

- Fichier touché : `src/pages/AdminPage.tsx` uniquement.
- On réutilise la fonction `geocodeAddress` déjà présente (ligne 272) et le pattern `manualLat` / `manualLng` du formulaire de création (lignes 438-446).
- Le `update` Supabase (ligne 1534) reçoit en plus `lat` et `lng` quand on a de nouvelles coordonnées ; sinon on n'envoie pas ces champs.
- Validation : si l'adresse a changé et qu'on n'a ni géocodage réussi ni saisie manuelle valide, on bloque l'enregistrement avec un toast (même UX que la création).
- Invalidation cache : `queryClient.invalidateQueries` sur les 3 query keys utilisées par la carte et la fiche.
