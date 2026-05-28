# Amélioration du bouton partage (fiche lieu)

## Objectif
Sur desktop, le bouton "Partager" doit copier l'URL dans le presse-papier avec une confirmation claire. Et l'icône doit être plus reconnaissable, dans le style iOS classique (carré avec flèche vers le haut).

## Changements

### 1. Icône iOS classique
Dans `src/pages/LocationPage.tsx` :
- Remplacer l'import `Share2` de `lucide-react` par `ArrowUpFromLine` (c'est l'icône Lucide la plus proche de l'icône partage native iOS — une flèche pointant vers le haut sortant d'une ligne horizontale).
- Remplacer `<Share2 size={18} ... />` par `<ArrowUpFromLine size={18} color="var(--primary)" strokeWidth={2} />`.

### 2. Fallback desktop amélioré
Comportement actuel : si `navigator.share` n'existe pas (cas desktop), on copie le lien + toast "Lien copié !".

Améliorations :
- **Détection plus fiable** : utiliser `navigator.share && navigator.canShare?.(shareData)` pour mieux distinguer mobile (menu natif) vs desktop (copie).
- **Toast plus visible et explicite** : `toast.success('Lien copié !', { description: 'Tu peux maintenant le coller où tu veux.', duration: 2500 })`.
- **Gestion d'erreur** : si `navigator.clipboard` échoue (contexte non sécurisé, vieux navigateur), afficher `toast.error('Impossible de copier le lien')`.
- **AbortError silencieux** : si l'utilisateur ferme le menu natif iOS sans partager, ne rien afficher (comportement actuel, conservé).

## Détails techniques

Nouvelle logique dans le `onClick` :

```ts
const url = window.location.href;
const shareData = { title: location.name, text: "Découvre ce lieu kid-friendly sur Kidmapp !", url };

const canUseNative = typeof navigator !== 'undefined'
  && typeof navigator.share === 'function'
  && (!navigator.canShare || navigator.canShare(shareData));

if (canUseNative) {
  try { await navigator.share(shareData); } catch { /* user cancelled */ }
  return;
}

try {
  await navigator.clipboard.writeText(url);
  toast.success('Lien copié !', { description: 'Tu peux maintenant le coller où tu veux.' });
} catch {
  toast.error('Impossible de copier le lien');
}
```

Aucune autre modification (position, taille, fond, ombre du bouton, ni bouton like) — uniquement l'icône et la logique de partage.
