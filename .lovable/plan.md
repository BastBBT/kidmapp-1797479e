

## Réappliquer le style logo de la prod dans le hero Auth

L'utilisateur a fourni les valeurs CSS exactes utilisées en prod pour le logo "kidmapp". Je vais les réappliquer telles quelles dans `AuthModal.tsx`.

### Changement

**`src/components/AuthModal.tsx`** — remplacer le style inline du logo par :

```ts
{
  fontFamily: 'Fraunces, serif',
  fontSize: 48,
  color: 'var(--primary)',         // #D95F3B via design tokens
  letterSpacing: '-0.04em',
  fontWeight: 500,
  position: 'relative',
  zIndex: 1,
}
```

Texte : `kidmapp` (minuscules, déjà en place).

Suppression de : `fontStyle: italic`, `fontVariationSettings: 'opsz' 72, 'WONK' 1'`, et taille `2.8rem` — non utilisés en prod.

### Note

Pas besoin de modifier l'import Google Fonts dans `index.css` : Fraunces est déjà importé avec les graisses 300/500/600 qui couvrent le `font-weight: 500` requis.

