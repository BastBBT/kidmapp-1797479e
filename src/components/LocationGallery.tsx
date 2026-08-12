import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Instagram, LayoutGrid, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { LocationMedia } from '@/lib/gallery';

interface LocationGalleryProps {
  media: LocationMedia[];
  /** Dégradé de catégorie, affiché quand un média n'a pas d'image. */
  gradient: string;
  name: string;
}

/**
 * Galerie de la fiche lieu : carrousel dans l'en-tête, grille complète, visionneuse
 * plein écran. Le reel Instagram y est un média comme un autre, signalé par son
 * bouton de lecture — la vidéo n'est pas jouée ici, elle s'ouvre dans Instagram.
 *
 * Miroir de `LocationGallerySheet` (iOS) et `LocationGalleryScreen` (Android).
 */
export default function LocationGallery({ media, gradient, name }: LocationGalleryProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [reelToOpen, setReelToOpen] = useState<string | null>(null);

  /** Les photos seules : c'est ce que parcourt la visionneuse plein écran. */
  const photos = media.filter((m) => !m.reelUrl && m.coverUrl).map((m) => m.coverUrl as string);

  const current = media[index];
  const go = (delta: number) => setIndex((i) => (i + delta + media.length) % media.length);

  const openReel = () => {
    if (reelToOpen) window.open(reelToOpen, '_blank', 'noopener,noreferrer');
    setReelToOpen(null);
  };

  return (
    <>
      {/* Média courant, sous les overlays de l'en-tête */}
      {current?.coverUrl ? (
        <img
          src={current.coverUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 1 }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient, zIndex: 1 }} />
      )}

      {current?.reelUrl && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2.5"
          style={{ zIndex: 3 }}
        >
          <button
            onClick={() => setReelToOpen(current.reelUrl as string)}
            aria-label={t('location_page.reel_play')}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 3px 10px rgba(0,0,0,0.28)' }}
          >
            <Play className="w-6 h-6 ml-0.5" style={{ color: 'var(--text)' }} fill="currentColor" />
          </button>
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-white"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <Instagram className="w-2.5 h-2.5" />
            {t('location_page.reel')}
          </span>
        </div>
      )}

      {media.length > 1 && (
        <>
          {/* Flèches — au clavier et à la souris ; le tactile utilise les pastilles */}
          <button
            onClick={() => go(-1)}
            aria-label={t('location_page.gallery_prev')}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center hidden md:flex"
            style={{ background: 'rgba(0,0,0,0.3)', zIndex: 5 }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label={t('location_page.gallery_next')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center hidden md:flex"
            style={{ background: 'rgba(0,0,0,0.3)', zIndex: 5 }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          {/* Pastilles de pagination — au-dessus de la carte de contenu, qui remonte
              de 24px par-dessus le bas de l'en-tête (`-mt-6` dans LocationPage). */}
          <div
            className="absolute left-0 right-0 bottom-11 flex justify-center gap-1.5"
            style={{ zIndex: 5 }}
          >
            {media.map((m, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1} / ${media.length}`}
                aria-current={i === index}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 16 : 6,
                  background: `rgba(255,255,255,${i === index ? 1 : 0.45})`,
                }}
              />
            ))}
          </div>

          {/* Accès à la galerie complète */}
          <button
            onClick={() => setShowGrid(true)}
            aria-label={t('location_page.gallery_see')}
            className="absolute right-4 bottom-8 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--text)', zIndex: 5 }}
          >
            <LayoutGrid className="w-3 h-3" />
            {media.length}
          </button>
        </>
      )}

      {/* Grille complète */}
      <Dialog open={showGrid} onOpenChange={setShowGrid}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('location_page.gallery')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto">
            {media.map((m, i) => (
              <button
                key={i}
                onClick={() => {
                  if (m.reelUrl) {
                    setReelToOpen(m.reelUrl);
                  } else if (m.coverUrl) {
                    setLightboxIndex(photos.indexOf(m.coverUrl));
                  }
                }}
                className="relative aspect-square rounded-xl overflow-hidden"
              >
                {m.coverUrl ? (
                  <img src={m.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: gradient }} />
                )}
                {m.reelUrl && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                        style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.92)' }}
                    >
                      <Play className="w-4 h-4 ml-0.5" style={{ color: 'var(--text)' }} fill="currentColor" />
                    </span>
                    <span
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <Instagram className="w-2 h-2" />
                      {t('location_page.reel')}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visionneuse plein écran — photos uniquement */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent
          className="max-w-5xl border-0 bg-black/95 p-0"
          aria-describedby={undefined}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={photos[lightboxIndex]}
                alt={name}
                className="max-h-[80vh] max-w-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex((i) => ((i as number) - 1 + photos.length) % photos.length)}
                    aria-label={t('location_page.gallery_prev')}
                    className="absolute left-3 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setLightboxIndex((i) => ((i as number) + 1) % photos.length)}
                    aria-label={t('location_page.gallery_next')}
                    className="absolute right-3 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sortie vers Instagram */}
      <AlertDialog open={reelToOpen !== null} onOpenChange={(open) => !open && setReelToOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('location_page.reel_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('location_page.reel_confirm_body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={openReel}>{t('location_page.reel_open')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
