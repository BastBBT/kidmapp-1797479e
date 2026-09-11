import { useEffect, useState, useRef, TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { recordSlidesOutcome, recordStep } from '@/lib/onboardingTracker';

interface OnboardingProps {
  onFinish: (mode: 'signup' | 'login' | 'browse') => void;
}


// Trois promesses, dans l'ordre du parcours d'usage : on vient pour les lieux
// (slide 1), on revient pour les sorties datées (slide 2), on ouvre un compte
// pour garder ses bons plans et nourrir la carte (slide 3).
const SLIDES = [
  {
    bg: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 60%, #E8A088 100%)',
    titleKey: 'onboarding.slide1_title',
    subtitleKey: 'onboarding.slide1_subtitle',
    illustration: 'map',
  },
  {
    bg: 'linear-gradient(160deg, #F0F7F4 0%, #C4E0D4 60%, #88C4A8 100%)',
    titleKey: 'onboarding.slide2_title',
    subtitleKey: 'onboarding.slide2_subtitle',
    illustration: 'sorties',
  },
  {
    bg: 'linear-gradient(160deg, #F5F0FA 0%, #D4C0E8 60%, #A888C4 100%)',
    titleKey: 'onboarding.slide3_title',
    subtitleKey: 'onboarding.slide3_subtitle',
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

/**
 * Reprend la grammaire visuelle de l'onglet Sorties : sélecteur de semaine, puis
 * des cartes d'événement à liseré de catégorie, avec leur date et leur horaire.
 * C'est la date qui porte la promesse — sans elle, ce ne serait qu'une liste.
 */
const SortiesIllustration = () => {
  const { t } = useTranslation();
  const events = [
    {
      emoji: '🎨',
      cat: t('category_event.Atelier'),
      accent: '#7F5BB5',
      name: t('onboarding.event_atelier'),
      date: t('onboarding.event_atelier_date'),
      extra: null as string | null,
      fav: false,
    },
    {
      emoji: '🎭',
      cat: t('category_event.Spectacle'),
      accent: '#EF9F27',
      name: t('onboarding.event_spectacle'),
      date: t('onboarding.event_spectacle_date'),
      extra: t('onboarding.extra_dates'),
      fav: true,
    },
  ];

  const pill = (label: string, active: boolean) => (
    <div
      style={{
        padding: '6px 13px',
        borderRadius: 100,
        background: active ? '#3B7D6E' : '#fff',
        border: active ? 'none' : '1px solid #E7E3DC',
        color: active ? '#fff' : 'rgba(28,25,23,0.6)',
        fontFamily: 'DM Sans',
        fontSize: 10,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      style={{
        width: 272,
        background: '#fff',
        borderRadius: 18,
        padding: 14,
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {pill(t('onboarding.this_week'), true)}
        {pill(t('onboarding.next_week'), false)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {events.map((ev, i) => (
          <div
            key={i}
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
            }}
          >
            <div style={{ height: 5, background: ev.accent }} />
            <div style={{ padding: '9px 11px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 100,
                    background: `${ev.accent}1F`,
                    color: ev.accent,
                    fontFamily: 'DM Sans',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {ev.emoji} {ev.cat}
                </div>
                <div style={{ flex: 1 }} />
                {ev.extra && (
                  <div
                    style={{
                      padding: '3px 7px',
                      borderRadius: 100,
                      background: '#FAF9F6',
                      border: '1px solid #E7E3DC',
                      fontFamily: 'DM Sans',
                      fontSize: 9,
                      fontWeight: 600,
                      color: 'rgba(28,25,23,0.6)',
                    }}
                  >
                    {ev.extra}
                  </div>
                )}
                <div style={{ color: ev.fav ? '#D95F3B' : '#E7E3DC', fontSize: 13 }}>♥</div>
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontFamily: 'Fraunces',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1C1917',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {ev.name}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontFamily: 'DM Sans',
                  fontSize: 10,
                  color: 'rgba(28,25,23,0.6)',
                }}
              >
                {ev.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Les favoris (ce qu'on garde) et le bouton « Proposer » (ce qu'on donne) dans la
 * même image : ce sont les deux raisons concrètes d'ouvrir un compte.
 */
const FavoritesIllustration = () => {
  const { t } = useTranslation();
  // Noms propres : jamais traduits.
  const rows = [
    { emoji: '🍕', name: 'La Cantine du Voyage', sub: t('onboarding.fav_resto'), bg: '#FAF0EC' },
    { emoji: '🎠', name: 'Parc des Oblates', sub: t('onboarding.fav_nature'), bg: '#EDF5E9' },
    { emoji: '☕', name: 'Café Mama', sub: t('onboarding.fav_cafe'), bg: '#EBF4F2' },
  ];

  return (
    <div style={{ position: 'relative', width: 252 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 14,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            fontFamily: 'Fraunces',
            fontSize: 14,
            fontWeight: 500,
            color: '#D95F3B',
            marginBottom: 10,
          }}
        >
          {t('onboarding.fav_header')}
        </div>
        {rows.map((c, i) => (
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
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: c.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              {c.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#1C1917' }}>
                {c.name}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: 'rgba(28,25,23,0.6)' }}>
                {c.sub}
              </div>
            </div>
            <div style={{ color: '#D95F3B', fontSize: 14 }}>♥</div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: -10,
          bottom: -16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '11px 16px',
          borderRadius: 100,
          background: '#D95F3B',
          color: '#fff',
          fontFamily: 'DM Sans',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 6px 18px rgba(217,95,59,0.38)',
        }}
      >
        <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>
        <span>{t('onboarding.propose')}</span>
      </div>
    </div>
  );
};

const Onboarding = ({ onFinish }: OnboardingProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Le swipe compte autant que le bouton « Suivant » : sans ça, quelqu'un qui
  // fait défiler à la main serait enregistré comme resté au slide 1.
  useEffect(() => {
    recordStep(index + 1);
  }, [index]);

  const finish = (mode: 'signup' | 'login' | 'browse') => {
    try {
      localStorage.setItem('kidmapp_hasSeenOnboarding', '1');
    } catch {
      // Navigation privée : on continue, l'accueil se rejouera au prochain passage.
    }
    recordSlidesOutcome(mode === 'browse' ? 'skipped' : 'completed');
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
          onClick={() => finish('browse')}
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
          {t('onboarding.skip')}
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
        {slide.illustration === 'sorties' && <SortiesIllustration />}
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
          {t(slide.titleKey)}
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
          {t(slide.subtitleKey)}
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
            {t('onboarding.next')}
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
                {t('onboarding.signup')}
            </button>
            <button
              onClick={() => finish('login')}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: 10,
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
              {t('onboarding.login')}
            </button>
            <button
              onClick={() => finish('browse')}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: 4,
                background: 'transparent',
                border: 'none',
                fontFamily: 'DM Sans',
                fontSize: 13,
                color: 'rgba(28,25,23,0.55)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t('onboarding.browse')}
            </button>

          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
