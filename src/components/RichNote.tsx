import { useRef, useState, type CSSProperties } from 'react';
import { Bold, Italic, List } from 'lucide-react';
import { parseNote, toggleBullet, wrapSelection, type InlineSpan, type NoteEdit } from '@/lib/richNote';

const Spans = ({ spans }: { spans: InlineSpan[] }) => (
  <>
    {spans.map((s, i) => (
      <span key={i} style={{ fontWeight: s.bold ? 600 : undefined, fontStyle: s.italic ? 'italic' : undefined }}>
        {s.text}
      </span>
    ))}
  </>
);

/** Rendu de la description d'un événement (gras, italique, listes). Pas de HTML injecté. */
export function RichNoteText({ note }: { note: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowWrap: 'anywhere' }}>
      {parseNote(note).map((b, i) => {
        if (b.kind === 'gap') return <div key={i} style={{ height: 4 }} />;
        if (b.kind === 'bullet') {
          return (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span aria-hidden>•</span>
              <span><Spans spans={b.spans} /></span>
            </div>
          );
        }
        return <div key={i}><Spans spans={b.spans} /></div>;
      })}
    </div>
  );
}

const toolStyle = (disabled: boolean): CSSProperties => ({
  width: 34, height: 30, borderRadius: 8, border: 'none', display: 'grid', placeItems: 'center',
  background: 'var(--primary-light, #FAF0EC)', color: disabled ? 'var(--text-muted)' : 'var(--primary)',
  cursor: disabled ? 'default' : 'pointer',
});

/** Textarea avec barre gras / italique / liste et onglet « Aperçu ». */
export function RichNoteEditor({
  value, onChange, placeholder, rows = 4, maxLength = 2000, textareaStyle, previewStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  textareaStyle?: CSSProperties;
  previewStyle?: CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const apply = (edit: (v: string, s: number, e: number) => NoteEdit) => {
    const el = ref.current;
    const s = el?.selectionStart ?? value.length;
    const e = el?.selectionEnd ?? value.length;
    const next = edit(value, s, e);
    if (next.value.length > maxLength) return;
    onChange(next.value);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.start, next.end);
    });
  };

  const tab = (active: boolean): CSSProperties => ({
    border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12,
    fontWeight: active ? 700 : 400, color: active ? 'var(--primary)' : 'var(--text-muted)', padding: '4px 6px',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6 }}>
        <button type="button" aria-label="Gras" title="Gras" disabled={preview} style={toolStyle(preview)}
          onClick={() => apply((v, s, e) => wrapSelection(v, s, e, '**'))}><Bold size={16} /></button>
        <button type="button" aria-label="Italique" title="Italique" disabled={preview} style={toolStyle(preview)}
          onClick={() => apply((v, s, e) => wrapSelection(v, s, e, '*'))}><Italic size={16} /></button>
        <button type="button" aria-label="Liste" title="Liste" disabled={preview} style={toolStyle(preview)}
          onClick={() => apply(toggleBullet)}><List size={16} /></button>
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" style={tab(!preview)} onClick={() => setPreview(false)}>Écrire</button>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <button type="button" style={tab(preview)} onClick={() => setPreview(true)}>Aperçu</button>
        </div>
      </div>
      {preview ? (
        <div style={{
          minHeight: rows * 22, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
          background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)', lineHeight: 1.5, ...previewStyle,
        }}>
          {value.trim() ? <RichNoteText note={value} /> : <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>}
        </div>
      ) : (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          style={{ width: '100%', resize: 'none', ...textareaStyle }}
        />
      )}
    </div>
  );
}
