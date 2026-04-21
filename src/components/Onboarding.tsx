import { useState, useRef, TouchEvent } from 'react';

interface OnboardingProps {
  onFinish: (mode: 'signup' | 'login') => void;
}

const SLIDES = [
  {
    bg: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 60%, #E8A088 100%)',
    title: 'Les meilleures adresses kid-friendly de Nantes',
    subtitle: '100+ lieux testés et approuvés par des parents nantais',
    illustration: 'map',
  },
  {
    bg: 'linear-gradient(160deg, #F0F7F4 0%, #C4E0D4 60%, #88C4A8 100%)',
    title: 'Filtré par catégorie, explore sur la carte',
    subtitle: 'Restos, parcs, cafés avec coin jeux, spectacles… tout est là',
    illustration: 'cards',
  },
  {
    bg: 'linear-gradient(160deg, #F5F0FA 0%, #D4C0E8 60%, #A888C4 100%)',
    title: 'Sauvegarde tes lieux préférés',
    subtitle: 'Retrouve tous tes bons plans en un clic, à tout moment',
    illustration: 'favorites',
  },
];

const MapIllustration = () => (
  <svg width="220" height="160" viewBox="0 0 220 160" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))' }}>
    <rect x="10" y="10" width="200" height="140" rx="18" fill="#fff" />
    {/* fake streets */}
    <path d="M10 60 L210 75" stroke="#E7E3DC" strokeWidth="3" strokeLinecap="round" />
    <path d="M10 110 L210 100" stroke="#E7E3DC" strokeWidth="3" strokeLinecap="round" />
    <path d="M70 10 L80 150" stroke="#E7E3DC" strokeWidth="3" strokeLinecap="round" />
    <path d="M150 10 L140 150" stroke="#E7E3DC" strokeWidth="3" strokeLinecap="round" />
    {/* pins */}
    {[
      { cx: 55, cy: 50, color: '#D95F3B', emoji: '🍴' },
      { cx: 130, cy: 40, color: '#3B7D6E', emoji: '☕' },
      { cx: 90, cy: 100, color: '#5A9A56', emoji: '🌳' },
      { cx: 170, cy: 115, color: '#C49A35', emoji: '🛍' },
    ].map((p, i) => (
      <g key={i}>
        <circle cx={p.cx} cy={p.cy} r="14" fill={p.color} />
        <circle cx={p.cx} cy={p.cy} r="14" fill={p.color} opacity="0.25" style={{ transform: `scale(1.6)`, transformOrigin: `${p.cx}px ${p.cy}px` }} />
        <text x={p.cx} y={p.cy + 5} textAnchor="middle" fontSize="14">{p.emoji}</text>
      </g>
    ))}
  </svg>
);

const CardsIllustration = () => (
  <div style={{ position: 'relative', width: 260, height: 180 }}>
    {[
      { top: 0, left: 0, rotate: -4, emoji: '🍕', name: 'Pizza Bella', cat: 'Restaurant', color: '#D95F3B' },
      { top: 50, left: 40, rotate: 2, emoji: '🌳', name: 'Parc Procé', cat: 'Parc', color: '#5A9A56' },
      { top: 100, left: 20, rotate: -2, emoji: '☕', name: 'Café Lily', cat: 'Café', color: '#3B7D6E' },
    ].map((c, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: c.top,
          left: c.left,
          width: 200,
          background: '#fff',
          borderRadius: 14,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          transform: `rotate(${c.rotate}deg)`,
        }}
      >
        <div style={{ fontSize: 24 }}>{c.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 14, fontWeight: 500, color: '#1C1917' }}>{c.name}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.cat}</div>
        </div>
      </div>
    ))}
  </div>
);

const FavoritesIllustration = () => (
  <div
    style={{
      width: 240,
      background: '#fff',
      borderRadius: 16,
      padding: 14,
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    }}
  >
    <div style={{ fontFamily: 'Fraunces', fontSize: 14, fontWeight: 500, color: '#1C1917', marginBottom: 10 }}>
      ❤️ Mes favoris (3)
    </div>
    {[
      { emoji: '🍕', name: 'Pizza Bella', cat: 'Restaurant', color: '#D95F3B' },
      { emoji: '🌳', name: 'Parc Procé', cat: 'Parc', color: '#5A9A56' },
      { emoji: '🎨', name: 'Atelier Kids', cat: 'Activité', color: '#C49A35' },
    ].map((c, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
          borderTop: i === 0 ? 'none' : '1px solid #F0EBE3',
        }}
      >
        <div style={{ fontSize: 18 }}>{c.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#1C1917' }}>{c.name}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 9, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.cat}</div>
        </div>
        <div style={{ color: '#D95F3B', fontSize: 14 }}>♥</div>
      </div>
    ))}
  </div>
);

const Onboarding = ({ onFinish }: OnboardingProps) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const finish = (mode: 'signup' | 'login') => {
    try {
      localStorage.setItem('kidmapp_hasSeenOnboarding', '1');
    } catch {}
    onFinish(mode);
  };

  const next = () => {
    if (index < SLIDES.length - 1) setIndex(index + 1);
  };

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40 && index < SLIDES.length - 1) setIndex(index + 1);
    if (dx > 40 && index > 0) setIndex(index - 1);
    touchStartX.current = null;
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        background: slide.bg,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.5s ease',
        overflow: 'hidden',
      }}
    >
      {/* Skip link */}
      {!isLast && (
        <button
          onClick={() => finish('signup')}
          style={{
            position: 'absolute',
            top: 'env(safe-area-inset-top, 16px)',
            right: 16,
            marginTop: 12,
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.5)',
            border: 'none',
            borderRadius: 100,
            fontFamily: 'DM Sans',
            fontSize: 13,
            color: '#1C1917',
            fontWeight: 500,
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          Passer
        </button>
      )}

      {/* Decorative blobs */}
      <svg style={{ position: 'absolute', top: '-40px', right: '-50px', width: 240, height: 240, opacity: 0.4 }} viewBox="0 0 220 220">
        <path d="M110,20 C155,15 200,55 210,100 C220,145 190,190 145,205 C100,220 50,200 25,160 C0,120 10,65 50,40 C70,27 85,22 110,20Z" fill="rgba(255,255,255,0.4)" />
      </svg>
      <svg style={{ position: 'absolute', bottom: '120px', left: '-40px', width: 180, height: 180, opacity: 0.35 }} viewBox="0 0 160 160">
        <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.4)" />
      </svg>

      {/* Illustration */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px 0',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {slide.illustration === 'map' && <MapIllustration />}
        {slide.illustration === 'cards' && <CardsIllustration />}
        {slide.illustration === 'favorites' && <FavoritesIllustration />}
      </div>

      {/* Text + actions */}
      <div
        style={{
          padding: '24px 28px calc(env(safe-area-inset-bottom, 0px) + 32px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily: 'Fraunces',
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.15,
            color: '#1C1917',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {slide.title}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans',
            fontSize: 15,
            color: 'rgba(28,25,23,0.7)',
            marginTop: 12,
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          {slide.subtitle}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                height: 8,
                width: i === index ? 26 : 8,
                borderRadius: 100,
                background: i === index ? 'var(--primary)' : 'rgba(28,25,23,0.18)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {!isLast ? (
          <button
            onClick={next}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 100,
              border: 'none',
              background: '#1C1917',
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            Suivant →
          </button>
        ) : (
          <>
            <button
              onClick={() => finish('signup')}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 100,
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'DM Sans',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 10px 28px rgba(217,95,59,0.35)',
              }}
            >
              Créer mon compte 🎉
            </button>
            <button
              onClick={() => finish('login')}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: 12,
                background: 'transparent',
                border: 'none',
                fontFamily: 'DM Sans',
                fontSize: 14,
                color: '#1C1917',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
              }}
            >
              Déjà un compte ? Se connecter
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
