# Carte « Confirmer les infos » sur la fiche

Remplacer le bouton isolé « Contribuer » (`src/pages/LocationPage.tsx`, lignes ~582-595) par une carte d'invitation.

## Contenu

- Déterminer si le lieu est une activité : `isActivity = (ACTIVITY_CATEGORIES as readonly string[]).includes(location.category)` (import depuis `@/types/location`).
- Titre : `Tu connais cette activité ?` si activité, sinon `Tu connais ce lieu ?`.
- Sous-titre :
  - Lieu : `Confirme ce qu'il y a sur place — chaise haute, table à langer, coin jeux… — pour garder la fiche à jour`
  - Activité : `Confirme ce qu'il y a sur place pour garder la fiche à jour`

## Structure JSX (remplace le `<button>` existant)

```
<div style={{
  marginTop: 16,
  padding: 16,
  borderRadius: 'var(--radius)',
  background: '#FAF0EC',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 6,
}}>
  <div style={{ fontSize: 26 }} aria-hidden>👋</div>
  <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>
    {isActivity ? 'Tu connais cette activité ?' : 'Tu connais ce lieu ?'}
  </div>
  <div style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.45, color: 'var(--text-muted)', maxWidth: 360 }}>
    {isActivity
      ? 'Confirme ce qu\'il y a sur place pour garder la fiche à jour'
      : 'Confirme ce qu\'il y a sur place — chaise haute, table à langer, coin jeux… — pour garder la fiche à jour'}
  </div>
  <button
    onClick={() => requireAuth(() => setShowContribute(true), { message: 'Connecte-toi pour partager tes infos sur ce lieu ✦' })}
    style={{
      marginTop: 8,
      padding: '11px 22px',
      borderRadius: 100,
      border: 'none',
      background: 'var(--primary)',
      color: '#fff',
      fontFamily: 'DM Sans',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(217,95,59,0.28)',
    }}
  >
    Confirmer les infos
  </button>
</div>
```

## Comportement

- Même handler `requireAuth` → `setShowContribute(true)` (aucun changement de logique, même sheet, même gate).
- Bouton « Itinéraire » juste en dessous inchangé.
- Pas de nouveau token de couleur : `#FAF0EC` inline (rose pâle décrit dans la demande).
