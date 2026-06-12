import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Share2, Instagram } from 'lucide-react';
import ShareLevelCard, { type ShareLevel } from './ShareLevelCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface ShareLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ShareLevel;
  points: number;
}

const FILENAME = 'mon-niveau-kidmapp.png';
const SHARE_TEXT = 'Mon niveau Kidmapp 🐘 @kidmapp';

const triggerDownload = (href: string, filename: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const canShareFiles = (file: File): boolean => {
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  };
  return typeof nav.canShare === 'function' && typeof nav.share === 'function' && nav.canShare({ files: [file] });
};

type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'error';

const shareFile = async (file: File): Promise<ShareResult> => {
  if (!canShareFiles(file)) return 'unsupported';
  const nav = navigator as Navigator & {
    share: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  try {
    await nav.share({ files: [file], title: 'Mon niveau Kidmapp', text: SHARE_TEXT });
    return 'shared';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    console.error('share error', e);
    return 'error';
  }
};

const ShareLevelModal = ({ open, onClose, level, points }: ShareLevelModalProps) => {
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [showWebInstaButton, setShowWebInstaButton] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const captureBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
  };

  // Desktop only
  const handleDesktopDownload = async () => {
    if (busy) return;
    setBusy(true);
    setShareNote(null);
    setShowWebInstaButton(false);
    try {
      const blob = await captureBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, FILENAME);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (e) {
      console.error('download error', e);
    } finally {
      setBusy(false);
    }
  };

  // Mobile: open native share sheet. Desktop: download + open Instagram in new tab.
  const handleShareAction = async () => {
    if (busy) return;
    setBusy(true);
    setShareNote(null);
    setShowWebInstaButton(false);
    try {
      const blob = await captureBlob();
      if (!blob) {
        setBusy(false);
        return;
      }
      const file = new File([blob], FILENAME, { type: 'image/png' });

      if (isMobile) {
        const result = await shareFile(file);
        if (result === 'shared' || result === 'cancelled') {
          // success or user cancellation → silent
          return;
        }
        // unsupported or error → open image in new tab so user can long-press → "Enregistrer l'image"
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setShareNote(
          "Appui long sur l'image → \"Enregistrer l'image\", puis ouvre Instagram → Stories."
        );
        setShowWebInstaButton(true);
      } else {
        // Desktop: download + open instagram.com
        const url = URL.createObjectURL(blob);
        triggerDownload(url, FILENAME);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        setShareNote(
          "Image téléchargée ✓ — Instagram s'ouvre dans un nouvel onglet. Termine le partage depuis ton mobile."
        );
      }
    } catch (e) {
      console.error('share error', e);
    } finally {
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
            {!isMobile && (
              <button
                type="button"
                onClick={handleDesktopDownload}
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
                {downloaded ? 'Image téléchargée ✓' : "Télécharger l'image"}
              </button>
            )}

            <button
              type="button"
              onClick={handleShareAction}
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
              {isMobile ? 'Partager mon niveau' : 'Partager sur Instagram'}
            </button>

            {isMobile && !shareNote && (
              <p style={{
                margin: 0,
                fontSize: 12.5,
                color: 'var(--text-muted)',
                textAlign: 'center',
                lineHeight: 1.45,
              }}>
                Choisis Instagram ou « Enregistrer l'image » dans le menu.
              </p>
            )}

            {shareNote && (
              <div
                role="status"
                style={{
                  margin: 0,
                  padding: 12,
                  background: '#FFF8F5',
                  border: '1px solid rgba(217,95,59,0.2)',
                  borderRadius: 12,
                  fontSize: 12.5,
                  color: 'var(--text)',
                  textAlign: 'center',
                  lineHeight: 1.45,
                }}
              >
                {shareNote}
              </div>
            )}

            {showWebInstaButton && (
              <button
                type="button"
                onClick={() =>
                  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
                }
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 100,
                  cursor: 'pointer',
                  background: '#fff',
                  color: 'var(--text)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'DM Sans',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Instagram size={15} />
                Ouvrir Instagram
              </button>
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
