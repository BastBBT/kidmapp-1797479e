import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Maximize2, X } from 'lucide-react';
import { supabaseResized, onResizedImageError } from '@/lib/imageUrl';

/** Défilement à la souris (le tactile défile nativement) ; un clic après un glisser est ignoré. */
function useMouseDragScroll(ref: React.RefObject<HTMLDivElement>) {
  const state = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    state.current = { down: true, startX: e.clientX, startLeft: ref.current.scrollLeft, moved: false };
    ref.current.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.down || !ref.current) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    ref.current.scrollLeft = s.startLeft - dx;
  };
  const end = () => {
    const el = ref.current;
    if (!state.current.down || !el) return;
    state.current.down = false;
    el.style.scrollSnapType = '';
    el.scrollTo({ left: Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth, behavior: 'smooth' });
  };
  /** À appeler dans le onClick : true si le clic termine un glisser et doit être ignoré. */
  const wasDrag = () => {
    const m = state.current.moved;
    state.current.moved = false;
    return m;
  };
  return { handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerLeave: end }, wasDrag };
}

/**
 * Photos du header de la fiche événement : défilent d'un geste derrière le titre, un clic
 * ouvre le plein écran. Points et compteur « 1 / N » en bas. À placer dans un parent en
 * `position: relative` ; le contenu du header doit être `pointer-events: none` pour laisser
 * passer le clic. Miroir de `EventPhotoPager` (iOS) et `EventHeroPhotos` (Android).
 */
export function EventHeroPhotos({
  photos, name, index, onIndexChange, onOpen,
}: {
  photos: string[];
  name: string;
  index: number;
  onIndexChange: (i: number) => void;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useMouseDragScroll(ref);

  // Recale le défilement quand l'index change depuis le plein écran.
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== index) el.scrollTo({ left: index * el.clientWidth });
  }, [index]);

  return (
    <>
      <div
        ref={ref}
        {...drag.handlers}
        onScroll={() => {
          const el = ref.current;
          if (el?.clientWidth) onIndexChange(Math.round(el.scrollLeft / el.clientWidth));
        }}
        onClick={() => { if (!drag.wasDrag()) onOpen(); }}
        style={{
          position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', cursor: 'zoom-in', touchAction: 'pan-x pan-y',
        }}
      >
        {photos.map((url, i) => (
          <img
            key={url}
            src={supabaseResized(url, { width: 1280, height: 720, quality: 80 })}
            onError={onResizedImageError(url)}
            alt={photos.length > 1 ? `${name} (${i + 1}/${photos.length})` : name}
            draggable={false}
            style={{ flex: '0 0 100%', width: '100%', height: '100%', objectFit: 'cover', scrollSnapAlign: 'start' }}
          />
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
        {photos.length > 1 && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', gap: 5, justifyContent: 'center' }}>
            {photos.map((_, i) => (
              <i
                key={i}
                style={{
                  height: 6, width: i === index ? 16 : 6, borderRadius: 3, transition: 'width .2s',
                  background: i === index ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </div>
        )}
        <span
          style={{
            position: 'absolute', right: 16, bottom: 10, display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'DM Sans', fontSize: 11,
            padding: '3px 9px', borderRadius: 99,
          }}
        >
          <Maximize2 size={10} />
          {photos.length > 1 && `${index + 1} / ${photos.length}`}
        </span>
      </div>
    </>
  );
}

/**
 * Plein écran : défilement entre les photos (glisser, ← →), double-clic / double-tap pour
 * zoomer, glisser vers le bas ou Échap pour fermer, miniatures pour sauter à une photo.
 */
export function EventPhotoViewer({
  photos, index, onIndexChange, onClose, closeLabel,
}: {
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  closeLabel: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useMouseDragScroll(track);
  const [zoomed, setZoomed] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (el && i >= 0 && i < photos.length) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }, [photos.length]);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: index * el.clientWidth });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(Math.round((track.current?.scrollLeft ?? 0) / (track.current?.clientWidth || 1)) + 1);
      if (e.key === 'ArrowLeft') go(Math.round((track.current?.scrollLeft ?? 0) / (track.current?.clientWidth || 1)) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleZoom = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomed === i) { setZoomed(null); return; }
    const box = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width;
    const fy = (e.clientY - box.top) / box.height;
    setZoomed(i);
    requestAnimationFrame(() => {
      const el = e.currentTarget;
      el.scrollLeft = fx * el.scrollWidth - el.clientWidth / 2;
      el.scrollTop = fy * el.scrollHeight - el.clientHeight / 2;
    });
  };

  const fade = Math.max(0.3, 1 - dragY / 500);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchMove={(e) => {
        const s = touch.current;
        if (!s || zoomed !== null) return;
        const dy = e.touches[0].clientY - s.y;
        const dx = e.touches[0].clientX - s.x;
        if (dy > 8 && dy > Math.abs(dx) * 1.5) setDragY(dy);
      }}
      onTouchEnd={() => {
        touch.current = null;
        if (dragY > 120) onClose(); else setDragY(0);
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column',
        background: `rgba(0,0,0,${fade})`, touchAction: 'pan-x', transition: dragY ? 'none' : 'background .2s',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: 16, opacity: Math.max(0, 1 - dragY / 150),
        }}
      >
        <button
          onClick={onClose}
          aria-label={closeLabel}
          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
          <X size={18} />
        </button>
        {photos.length > 1 && (
          <span style={{ color: '#fff', fontFamily: 'DM Sans', fontSize: 13, background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 99 }}>
            {index + 1} / {photos.length}
          </span>
        )}
        <span style={{ width: 36 }} />
      </div>

      <div
        ref={track}
        {...drag.handlers}
        onScroll={() => {
          const el = track.current;
          if (el?.clientWidth) {
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) { onIndexChange(i); setZoomed(null); }
          }
        }}
        style={{
          flex: 1, display: 'flex', overflowX: zoomed === null ? 'auto' : 'hidden', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', transform: `translateY(${dragY}px) scale(${1 - Math.min(dragY / 1600, 0.1)})`,
          transition: dragY ? 'none' : 'transform .2s',
        }}
      >
        {photos.map((url, i) => (
          <div
            key={url}
            onDoubleClick={(e) => toggleZoom(i, e)}
            style={{
              flex: '0 0 100%', scrollSnapAlign: 'center', overflow: zoomed === i ? 'auto' : 'hidden',
              display: 'grid', placeItems: zoomed === i ? 'start' : 'center', cursor: zoomed === i ? 'zoom-out' : 'grab',
            }}
          >
            <img
              src={supabaseResized(url, { width: 1600, quality: 85, resize: 'contain' })}
              onError={onResizedImageError(url)}
              alt=""
              draggable={false}
              style={
                zoomed === i
                  ? { width: '250%', maxWidth: 'none', height: 'auto' }
                  : { width: '100%', height: '100%', objectFit: 'contain' }
              }
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '10px 12px 18px', opacity: Math.max(0, 1 - dragY / 150) }}>
          {photos.map((url, i) => (
            <button
              key={url}
              onClick={() => go(i)}
              aria-label={`${i + 1} / ${photos.length}`}
              style={{
                width: 46, height: 46, borderRadius: 8, padding: 0, cursor: 'pointer', overflow: 'hidden',
                border: `2px solid ${i === index ? '#fff' : 'transparent'}`, opacity: i === index ? 1 : 0.5, background: 'none',
              }}
            >
              <img src={supabaseResized(url, { width: 120, height: 120, quality: 60 })} onError={onResizedImageError(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
