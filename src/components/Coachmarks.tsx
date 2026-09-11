import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  canSkipStep,
  stepNumber,
  stepRadius,
  STEP_TOTAL,
  useCoachmarks,
  type CoachmarkStep,
} from '@/hooks/useCoachmarks';

const SCRIM = 'rgba(28,25,23,0.62)';
const GAP = 16;
const BUBBLE_MAX = 320;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Marge ajoutée autour de la cible pour que le halo ne colle pas au contenu. */
const inset = (step: CoachmarkStep) => (step === 'propose' ? 6 : 8);

/**
 * Voile percé + bulle, posés en `fixed` au-dessus de toute l'app.
 *
 * Contrairement aux versions natives, il n'y a pas de problème de superposition :
 * un overlay `fixed` à fort `z-index` passe au-dessus de la barre du bas et du
 * bouton flottant, donc rien à masquer à la main.
 */
const Coachmarks = () => {
  const { t } = useTranslation();
  const { current, targetOf, next, skip } = useCoachmarks();
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledFor = useRef<CoachmarkStep | null>(null);

  // La carte « Confirmer les infos » est loin sous la ligne de flottaison : on
  // l'amène au centre. Deux précautions apprises en la faisant échouer :
  //  - `behavior: 'auto'` et non `'smooth'` — l'arrivée sur la route remet le
  //    défilement à zéro juste après, ce qui annulait l'animation en cours ;
  //  - trois tentatives espacées, pour passer APRÈS cette remise à zéro sans
  //    entrer dans une boucle qui se relancerait indéfiniment.
  useEffect(() => {
    if (!current) {
      scrolledFor.current = null;
      return;
    }
    if (scrolledFor.current === current) return;
    const el = targetOf(current);
    if (!el) return;
    scrolledFor.current = current;

    const bring = () => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight - 40) {
        el.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    };
    bring();
    const timers = [250, 600].map((d) => window.setTimeout(bring, d));
    return () => timers.forEach(window.clearTimeout);
  }, [current, targetOf]);

  // La position d'une cible n'est connue qu'après peinture, et elle bouge :
  // défilement, redimensionnement, et surtout ré-enregistrement de la cible
  // quand son écran se re-rend.
  useLayoutEffect(() => {
    if (!current) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = targetOf(current);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = inset(current);
      const top = Math.max(6, r.top - pad);
      const left = Math.max(6, r.left - pad);
      const right = Math.min(window.innerWidth - 6, r.right + pad);
      const bottom = Math.min(window.innerHeight - 6, r.bottom + pad);
      setRect({ top, left, width: right - left, height: bottom - top });
    };

    // Le début d'une étape est instable : le défilement se pose, les photos
    // arrivent et poussent la mise en page. On remesure à chaque frame pendant
    // 1,5 s — assez pour que le halo colle à la cible, borné pour ne pas laisser
    // tourner une boucle pendant toute la visite. Ensuite les écouteurs suffisent.
    let frame = 0;
    const deadline = Date.now() + 1500;
    const settle = () => {
      measure();
      if (Date.now() < deadline) frame = requestAnimationFrame(settle);
    };
    settle();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [current, targetOf]);

  if (!current) return null;

  // Filet : si la cible n'est pas (encore) mesurable — hors cadre, pas encore
  // montée, mise en page qui bouge — on montre quand même la bulle, centrée et
  // sans halo, plutôt que de la faire disparaître. Une bulle qui s'évapore
  // laisse la visite bloquée sans aucun moyen d'en sortir.
  const anchored = !!rect && rect.width > 8 && rect.height > 8;
  const centerY = anchored ? rect!.top + rect!.height / 2 : window.innerHeight / 2;
  const placeBelow = anchored && centerY < window.innerHeight * 0.45;
  const bubbleWidth = Math.min(BUBBLE_MAX, window.innerWidth - 32);
  const limit = bubbleWidth / 2 - 26;
  const pointerOffset = anchored
    ? Math.max(-limit, Math.min(limit, rect!.left + rect!.width / 2 - window.innerWidth / 2))
    : 0;

  const pointer = (up: boolean) => (
    <div
      style={{
        width: 18,
        height: 9,
        transform: `translateX(${pointerOffset}px)`,
        background: 'var(--surface, #fff)',
        clipPath: up ? 'polygon(50% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 50% 100%)',
      }}
    />
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 3000 }}
      role="dialog"
      aria-modal="true"
      aria-label={t(`coachmark.${current}.title`)}
    >
      {/* Voile percé : le trou laisse voir la cible, le reste absorbe les clics
          pour qu'on ne puisse pas agir sur l'app pendant la visite. Sans cible
          mesurable, voile plein et pas de trou. */}
      {anchored ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: rect!.top,
            left: rect!.left,
            width: rect!.width,
            height: rect!.height,
            borderRadius: stepRadius(current),
            boxShadow: `0 0 0 9999px ${SCRIM}`,
            outline: '2px solid #F2C94C',
            pointerEvents: 'auto',
          }}
        />
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, background: SCRIM }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          ...(anchored
            ? placeBelow
              ? { top: rect!.top + rect!.height + GAP }
              : { bottom: window.innerHeight - rect!.top + GAP }
            : { top: '50%', transform: 'translateY(-50%)' }),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {anchored && placeBelow && pointer(true)}
        <div
          style={{
            width: bubbleWidth,
            boxSizing: 'border-box',
            padding: '16px 18px 14px',
            borderRadius: 16,
            background: 'var(--surface, #fff)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontFamily: 'DM Sans',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: 'var(--primary)',
            }}
          >
            {stepNumber(current)} / {STEP_TOTAL}
          </div>
          <div
            style={{
              marginTop: 5,
              fontFamily: 'Fraunces',
              fontSize: 18,
              fontWeight: 500,
              lineHeight: 1.25,
              color: 'var(--text)',
            }}
          >
            {t(`coachmark.${current}.title`)}
          </div>
          <p
            style={{
              margin: '7px 0 0',
              fontFamily: 'DM Sans',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
            }}
          >
            {t(`coachmark.${current}.body`)}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: canSkipStep(current) ? 'space-between' : 'flex-end',
              marginTop: 14,
            }}
          >
            {canSkipStep(current) && (
              <button
                onClick={skip}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px 0',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {t('coachmark.skip')}
              </button>
            )}
            <button
              onClick={next}
              style={{
                height: 38,
                padding: '0 20px',
                borderRadius: 100,
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'DM Sans',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {current === 'propose'
                ? t('coachmark.see_listing')
                : current === 'contribute'
                  ? t('coachmark.lets_go')
                  : t('coachmark.next')}
            </button>
          </div>
        </div>
        {anchored && !placeBelow && pointer(false)}
      </div>
    </div>
  );
};

export default Coachmarks;
