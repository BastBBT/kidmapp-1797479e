import { useRef, useState, useEffect, type ChangeEvent, type DragEvent } from 'react';
import { toast } from 'sonner';

interface GalleryUploadProps {
  /** Photos supplémentaires déjà enregistrées, dans l'ordre d'affichage. */
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  /** Fichiers choisis mais pas encore envoyés — ajoutés à la fin de la galerie. */
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

/**
 * Galerie du lieu : les photos qui viennent **en plus** de la photo principale.
 * L'ordre est celui du carrousel de la fiche, d'où les flèches de réordonnancement.
 */
export default function GalleryUpload({
  urls,
  onUrlsChange,
  files,
  onFilesChange,
}: GalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const objectUrls = files.map((f) => URL.createObjectURL(f));
    setPreviews(objectUrls);
    return () => objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const validateAndAdd = (list: FileList | null) => {
    if (!list?.length) return;
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name} : format non supporté (JPG, PNG, WebP)`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} : image trop lourde (max 5 Mo)`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) onFilesChange([...files, ...accepted]);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndAdd(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    validateAndAdd(e.dataTransfer.files);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= urls.length) return;
    const next = [...urls];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onUrlsChange(next);
  };

  const total = urls.length + files.length;

  const tile: React.CSSProperties = {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: 12,
    overflow: 'hidden',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
  };
  const iconBtn: React.CSSProperties = {
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 22,
    height: 22,
    cursor: 'pointer',
    fontSize: 11,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div>
      <label
        style={{
          fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)',
          fontWeight: 500, display: 'block', marginBottom: 6,
        }}
      >
        Galerie {total > 0 && `(${total} photo${total > 1 ? 's' : ''} en plus)`}
      </label>

      {total > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 8,
          }}
        >
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} style={tile}>
              <img
                src={url}
                alt={`Photo ${i + 2}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: 4, right: 4 }}>
                <button
                  type="button"
                  onClick={() => onUrlsChange(urls.filter((_, j) => j !== i))}
                  style={iconBtn}
                  aria-label={`Retirer la photo ${i + 2}`}
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
              <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  style={{ ...iconBtn, opacity: i === 0 ? 0.35 : 1 }}
                  aria-label="Déplacer avant"
                  title="Déplacer avant"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === urls.length - 1}
                  style={{ ...iconBtn, opacity: i === urls.length - 1 ? 0.35 : 1 }}
                  aria-label="Déplacer après"
                  title="Déplacer après"
                >
                  →
                </button>
              </div>
            </div>
          ))}

          {files.map((f, i) => (
            <div key={`pending-${i}`} style={{ ...tile, borderColor: 'var(--primary)' }}>
              {previews[i] && (
                <img
                  src={previews[i]}
                  alt={f.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <div style={{ position: 'absolute', top: 4, right: 4 }}>
                <button
                  type="button"
                  onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                  style={iconBtn}
                  aria-label={`Annuler ${f.name}`}
                  title="Annuler"
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  background: 'rgba(217,95,59,0.9)', color: '#fff',
                  fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600,
                  textAlign: 'center', padding: '3px 4px',
                }}
              >
                À envoyer
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 14,
          border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
          background: dragActive ? 'var(--accent-light)' : 'var(--bg)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color .15s, background .15s',
        }}
      >
        <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Ajouter des photos
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          JPG, PNG ou WebP — max 5 Mo — sélection multiple possible
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInput}
          style={{ display: 'none' }}
        />
      </div>

      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        La photo principale ouvre le carrousel ; ces photos viennent ensuite, dans cet ordre.
      </div>
    </div>
  );
}
