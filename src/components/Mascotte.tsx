import { useEffect, useRef, useState } from 'react';
import mascotteVideo from '@/assets/mascotte-coucou.mp4';
import mascotteFace from '@/assets/mascotte-face.png';

/** Fond exact de l'animation fournie : le raccord disparaît sur le bord du
 *  médaillon au lieu d'être masqué, sans transparence à bricoler. */
export const MASCOTTE_BACKGROUND = '#E9E5D1';

interface MascotteMedallionProps {
  width?: number;
  height?: number;
  /** Passages avant de se figer sur la dernière image. Une boucle de 4 s qui
   *  tourne pendant qu'on lit trois questions finit par gêner. */
  loops?: number;
  ariaLabel: string;
}

/**
 * La mascotte en buste, base ouverte, en tête de l'assistant.
 *
 * Le haut reste un arc de cercle, le bas s'ouvre et s'efface en dégradé : deux
 * raisons à cette forme plutôt qu'un cercle fermé — l'animation source coupe
 * déjà le personnage sous le ventre (un cercle fermé en aurait fait une tranche
 * nette), et le fond de la vidéo est opaque (un bord franc dessinerait une
 * arête beige en travers du crème de l'écran). On découpe le conteneur, fond
 * compris — jamais la vidéo, qui n'a pas besoin d'alpha.
 *
 * L'image fixe reste rendue en permanence sous la vidéo : un lecteur qui ne
 * peint rien (échec de décodage, lecture arrêtée) laisserait sinon un
 * médaillon vide. Miroir de `MascotteMedallion` (iOS `AssistantView.swift`,
 * Android `mascotte.dart`).
 */
export const MascotteMedallion = ({ width = 152, height = 120, loops = 2, ariaLabel }: MascotteMedallionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduceMotion) return;
    const video = videoRef.current;
    if (!video) return;
    let played = 0;
    const handleEnded = () => {
      played += 1;
      if (played >= loops) {
        setFinished(true);
      } else {
        video.currentTime = 0;
        void video.play();
      }
    };
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [reduceMotion, loops]);

  const showVideo = !failed && !finished && !reduceMotion;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{
        width,
        height,
        position: 'relative',
        flexShrink: 0,
        background: MASCOTTE_BACKGROUND,
        borderTopLeftRadius: width / 2,
        borderTopRightRadius: width / 2,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        borderTop: '3px solid var(--surface)',
        borderLeft: '3px solid var(--surface)',
        borderRight: '3px solid var(--surface)',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 74%, transparent 99%)',
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 74%, transparent 99%)',
      }}
    >
      <img
        src={mascotteFace}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'top',
        }}
      />
      {showVideo && (
        <video
          ref={videoRef}
          src={mascotteVideo}
          autoPlay
          muted
          playsInline
          onError={() => setFailed(true)}
          style={{
            position: 'absolute', inset: 0, margin: 'auto', width: '88%', height: '88%',
            objectFit: 'cover', objectPosition: 'top',
          }}
        />
      )}
    </div>
  );
};

interface MascotteMiniatureProps {
  size?: number;
}

/**
 * Miniature ronde purement visuelle — le point d'entrée principal du header
 * une fois que le popup ne se pousse plus qu'une fois par semaine (le
 * vendredi), donc affichée à côté d'un texte plutôt que seule. C'est
 * l'appelant qui porte le bouton et l'accessibilité (cf. `Header.tsx`),
 * comme sur iOS et Android où `MascotteMiniature` n'est pas non plus un
 * bouton — le `Button`/`InkWell` qui l'entoure vient du site d'appel.
 */
export const MascotteMiniature = ({ size = 32 }: MascotteMiniatureProps) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: MASCOTTE_BACKGROUND,
      border: '1px solid var(--border)',
      flexShrink: 0,
    }}
  >
    <img src={mascotteFace} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>
);
