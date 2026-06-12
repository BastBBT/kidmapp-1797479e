# Questionnaire d'acquisition post-inscription

## Migration DB

Ajouter à `public.profiles` :
- `acquisition_source text`
- `acquisition_detail text`
- `acquisition_source_at timestamptz`

Pas de nouvelle policy : les policies update existantes sur `profiles` (user peut modifier son propre profil) couvrent déjà l'écriture. `prevent_role_self_escalation` reste actif.

## Composant `src/components/AcquisitionModal.tsx` (nouveau)

Props : `open: boolean`, `onClose: () => void`.

Contenu :
- Titre Fraunces 20px : « Une dernière chose ! »
- Sous-titre DM Sans 13px muted : « Comment avez-vous découvert Kidmapp ? 🧡 »
- 6 options en liste verticale (boutons radio personnalisés). Sélection unique :
  - `social` 📱 Réseaux sociaux
  - `word_of_mouth` 💬 Bouche à oreille
  - `partner_place` 📍 Un lieu partenaire
  - `search` 🔎 Recherche web / App Store
  - `press` 📰 Presse ou blog
  - `other` ✨ Autre…
- État sélectionné : bordure `#D95F3B`, fond `#FFF8F5`, check ✓ à droite.
- Si `other` sélectionné → textarea apparait (« Dites-nous en quelques mots… », maxLength 280, `font-size:16px` anti-zoom iOS).
- Bouton principal « Valider » (coral, plein largeur, disabled tant que pas de sélection).
- Lien « Passer » (texte gris souligné, centré, sous le bouton).

Style : bottom-sheet mobile (même structure que `ShareLevelModal` — overlay z-1000, `border-radius: 20px 20px 0 0`, slideUp anim, `maxWidth: 440`), centré sur desktop via `align-items: center` quand `!isMobile`.

Comportements :
- **Valider** → `supabase.from('profiles').update({ acquisition_source, acquisition_detail: detail.trim() || null, acquisition_source_at: new Date().toISOString() }).eq('id', user.id)`. Erreur silencieuse côté UI (console.error), on ferme et pose le flag quoi qu'il arrive pour ne pas re-spammer.
- **Passer** → pose le flag, ferme. Aucune écriture.
- Dans les deux cas : `localStorage.setItem('hasAnsweredAcquisition', 'true')` puis `onClose()`.
- Pas de fermeture par clic backdrop ou croix → toujours via Valider/Passer (évite les fermetures accidentelles tout en restant skippable).

## Wiring : `src/App.tsx`

Nouveau composant `AcquisitionOverlay` (à côté de `OnboardingOverlay`) :
- Hooks `useAuth()` (récupère `user`, `isLoading`).
- Détecte la transition `prevUserId !== currentUserId && currentUserId != null` via un `useRef<string|null>`.
- Sur transition non-connecté → connecté :
  - Lit `localStorage.getItem('hasAnsweredAcquisition')`.
  - Si absent → `setShow(true)`.
- Rendu : `<AcquisitionModal open={show} onClose={() => setShow(false)} />`.
- Monté dans `AppContent` à la suite de `<OnboardingOverlay />`.

Note : utilisateurs déjà connectés au moment du déploiement → la transition n'a pas lieu, donc on déclenche aussi `setShow(true)` au premier render si `user && !isLoading && !flag`. C'est conforme à la consigne (« les utilisateurs déjà inscrits avant la feature le verront aussi une fois »).

## Hors scope
- Pas de modif de `AuthModal`, `Onboarding`, ni du flow signup (pas de friction).
- Pas de stat admin / dashboard de cette donnée pour l'instant.
- Pas de traduction multi-langue.
- Pas de nouvelle policy RLS (les UPDATE existantes suffisent).

## Détails techniques

- Pas de nouvelle dépendance.
- `useIsMobile` pour adapter centrage desktop vs bottom-sheet mobile.
- Types Supabase régénérés après migration → champs nouveaux dispo dans `.update()`.
- Flag localStorage volontairement device-local : si l'utilisateur change de navigateur il pourrait revoir la modale, mais c'est l'option la plus simple et conforme à la spec.
