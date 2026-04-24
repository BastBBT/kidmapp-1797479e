## Plan : Pages /privacy et /support (publiques)

### 1. Création des pages

**`src/pages/PrivacyPage.tsx`** — Politique de confidentialité
- Layout sobre, fond `bg-background` (cream #FAF9F6)
- Titre en Fraunces (`font-serif`), corps en DM Sans
- Contenu structuré en sections : Données collectées, Utilisation, Partage, Suppression de compte, Contact
- Lien `mailto:hello@kidmapp.app`
- Bouton retour en haut (← Retour) vers `/`
- Padding bottom 120px (compat bottom nav si user connecté)

**`src/pages/SupportPage.tsx`** — Page de support
- Hero : "Besoin d'aide ?" (Fraunces) + sous-titre Caveat "On est là pour vous aider"
- FAQ avec composant `Accordion` (shadcn) — 4 questions
- Section contact avec mailto
- Bouton retour vers `/`
- Même padding/style

### 2. Routing — `src/App.tsx`

Déplacer les routes `/privacy` et `/support` **hors de `<AuthGate>`** pour qu'elles soient accessibles sans connexion (important pour Apple App Store) :

```tsx
<Routes>
  <Route path="/privacy" element={<PrivacyPage />} />
  <Route path="/support" element={<SupportPage />} />
  <Route path="*" element={
    <AuthGate>
      <Routes>
        <Route path="/" element={<Index />} />
        {/* autres routes protégées */}
      </Routes>
    </AuthGate>
  } />
</Routes>
```

### 3. Footer dans AccountPage

Ajouter en bas de `src/pages/AccountPage.tsx`, avant le padding du bottom nav :
- Liens `/privacy` et `/support` (style discret, text-muted-foreground, text-sm)
- Séparateur `·`
- Copyright "© 2026 Kidmapp" en dessous
- Centré, padding vertical

### 4. Points d'attention
- Pages publiques → pas de `useAuth` requis pour le rendu
- BottomNav reste conditionnel à `user`, donc invisible pour visiteurs non connectés sur `/privacy` et `/support`
- Design system respecté : Coral #D95F3B pour liens/CTA, Fraunces titres, DM Sans corps
- Responsive mobile-first (max-w-2xl centré)

### Fichiers modifiés/créés
- ✅ Créé : `src/pages/PrivacyPage.tsx`
- ✅ Créé : `src/pages/SupportPage.tsx`
- ✏️ Modifié : `src/App.tsx` (routes publiques)
- ✏️ Modifié : `src/pages/AccountPage.tsx` (footer)
