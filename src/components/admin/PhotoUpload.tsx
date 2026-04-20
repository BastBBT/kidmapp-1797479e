import { useRef, useState, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { toast } from 'sonner';

interface PhotoUploadProps {
  /** Current photo URL persisted in DB (used to display existing image) */
  currentUrl: string | null;
  /** Pending file selected by user (not yet uploaded) */
  file: File | null;
  /** Called when user picks a new file (or clears it) */
  onFileChange: (file: File | null) => void;
  /** Called when user edits the manual URL fallback */
  onUrlChange?: (url: string) => void;
  /** Manual URL value (fallback) */
  urlValue?: string;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

export default function PhotoUpload({
  currentUrl,
  file,
  onFileChange,
  onUrlChange,
  urlValue,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validateAndSet = (f: File | undefined | null) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      toast.error('Format non supporté (JPG, PNG, WebP)');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('Image trop lourde (max 5 Mo)');
      return;
    }
    onFileChange(f);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndSet(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    validateAndSet(e.dataTransfer.files?.[0]);
  };

  const displayedImage = preview ?? currentUrl;

  return (
    <div>
      <label
        style={{
          fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)',
          fontWeight: 500, display: 'block', marginBottom: 6,
        }}
      >
        Photo
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: displayedImage ? 180 : 140,
          borderRadius: 14,
          border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
          background: dragActive ? 'var(--accent-light)' : 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden',
          transition: 'border-color .15s, background .15s',
        }}
      >
        {displayedImage ? (
          <>
            <img
              src={displayedImage}
              alt="Aperçu"
              style={{ width: '100%', height: 200, objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent 50%)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                padding: 12, gap: 8,
              }}
            >
              <span
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  color: 'var(--text)',
                  padding: '6px 14px', borderRadius: 100,
                  fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                }}
              >
                {file ? '✓ Nouvelle photo prête' : 'Remplacer'}
              </span>
              {file && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                  style={{
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', borderRadius: '50%', width: 24, height: 24,
                    cursor: 'pointer', fontSize: 12,
                  }}
                  aria-label="Annuler la sélection"
                >
                  ✕
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ margin: '0 auto 8px', display: 'block' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Cliquer pour ajouter une photo
            </div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              JPG, PNG ou WebP — max 5 Mo
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInput}
          style={{ display: 'none' }}
        />
      </div>

      {onUrlChange && (
        <div style={{ marginTop: 8 }}>
          {!showUrlField ? (
            <button
              type="button"
              onClick={() => setShowUrlField(true)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)',
                textDecoration: 'underline', padding: 0,
              }}
            >
              Ou entrer une URL
            </button>
          ) : (
            <input
              type="text"
              value={urlValue ?? ''}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://…"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--surface)',
                fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)',
                outline: 'none',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
