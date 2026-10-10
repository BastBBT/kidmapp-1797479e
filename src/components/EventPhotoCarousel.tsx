import { useRef, useState } from 'react';
import { supabaseResized, onResizedImageError } from '@/lib/imageUrl';

/**
 * Photos de la fiche événement : bandeau défilant (une photo = le rendu historique),
 * compteur « 1 / 3 » et points. Miroir de `EventPhotoCarousel` (iOS) et `event_photo_carousel.dart` (Android).
 */
export default function EventPhotoCarousel({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          borderRadius: 'var(--radius)', scrollbarWidth: 'none',
        }}
      >
        {photos.map((url, i) => (
          <img
            key={url}
            src={supabaseResized(url, { width: 900, height: 440, quality: 80 })}
            onError={onResizedImageError(url)}
            alt={photos.length > 1 ? `${name} (${i + 1}/${photos.length})` : name}
            style={{ flex: '0 0 100%', width: '100%', height: 220, objectFit: 'cover', scrollSnapAlign: 'start' }}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span
            style={{
              position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontFamily: 'DM Sans', fontSize: 11, padding: '2px 8px', borderRadius: 99,
            }}
          >
            {index + 1} / {photos.length}
          </span>
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', gap: 5, justifyContent: 'center' }}>
            {photos.map((_, i) => (
              <i
                key={i}
                style={{
                  height: 6, width: i === index ? 16 : 6, borderRadius: 3,
                  background: i === index ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'width .15s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
