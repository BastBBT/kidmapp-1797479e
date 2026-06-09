import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Share2 } from 'lucide-react';
import ShareLevelCard, { type ShareLevel } from './ShareLevelCard';

interface ShareLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ShareLevel;
  points: number;
}

const ShareLevelModal = ({ open, onClose, level, points }: ShareLevelModalProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const capture = async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    return await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'mon-niveau-kidmapp.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (e) {
      console.error('download error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleInstagram = async () => {
    if (busy) return;
    setBusy(true);
    setShareNote(null);
    try {
      const canvas = await capture();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'mon-niveau-kidmapp.png', { type: 'image/png' });
        const nav = navigator as any;
        if (nav.canShare?.({ files: [file] })) {
          try {
            await nav.share({ files: [file], title: 'Mon niveau Kidmapp' });
          } catch {
            // user cancelled
          }
        } else {
          setShareNote("Sur mobile : Instagram → Stories → ajoute depuis ta galerie");
        }
        setBusy(false);
      }, 'image/png');
    } catch (e) {
      console.error('share error', e);
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 440,
          padding: '20px 20px 28px',
          fontFamily: 'DM Sans',
          position: 'relative',
          maxHeight: '92vh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 999,
            color: '#666',
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          paddingTop: 6,
        }}>
          <h2 style={{
            fontFamily: 'Fraunces',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0,
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}>
            Partage ton niveau sur Instagram
          </h2>
          <p style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: 0,
            textAlign: 'center',
          }}>
            N'oublie pas de nous taguer <strong>@kidmapp</strong> 🐘
          </p>

          <div style={{ pointerEvents: 'none', margin: '4px 0 6px' }}>
            <ShareLevelCard ref={cardRef} level={level} points={points} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy}
              style={{
                width: '100%',
                padding: '13px 16px',
                border: 'none',
                borderRadius: 100,
                cursor: busy ? 'wait' : 'pointer',
                background: downloaded ? '#3B7D6E' : '#D95F3B',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'DM Sans',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s ease',
              }}
            >
              <Download size={16} />
              {downloaded ? 'Image téléchargée ✓' : "Enregistrer l'image"}
            </button>

            <button
              type="button"
              onClick={handleInstagram}
              disabled={busy}
              style={{
                width: '100%',
                padding: '13px 16px',
                border: 'none',
                borderRadius: 100,
                cursor: busy ? 'wait' : 'pointer',
                background: 'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'DM Sans',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Share2 size={16} />
              Partager sur Instagram
            </button>

            {shareNote && (
              <p style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}>
                {shareNote}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ShareLevelModal;
