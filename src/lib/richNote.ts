/**
 * Description d'événement avec mise en forme : Markdown minimal stocké tel quel dans
 * `events.note` — `**gras**`, `*italique*`, listes (`- `). Aucun HTML, aucun lien : un texte
 * saisi par un contributeur ne devient jamais cliquable.
 * Mêmes règles que `RichNoteText` (iOS, DesignSystem.swift) et `rich_note.dart` (Android) :
 * toute évolution de la syntaxe se fait sur les trois plateformes.
 */

export type InlineSpan = { text: string; bold: boolean; italic: boolean };
export type NoteBlock =
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'bullet'; spans: InlineSpan[] }
  | { kind: 'gap' };

const INLINE = /\*\*(?=\S)(.+?)(?<=\S)\*\*|\*(?=\S)(.+?)(?<=\S)\*/g;

export function parseInline(source: string, bold = false, italic = false): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let cursor = 0;
  for (const m of source.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > cursor) spans.push({ text: source.slice(cursor, start), bold, italic });
    if (m[1] !== undefined) spans.push(...parseInline(m[1], true, italic));
    else spans.push({ text: m[2], bold, italic: true });
    cursor = start + m[0].length;
  }
  if (cursor < source.length) spans.push({ text: source.slice(cursor), bold, italic });
  return spans;
}

const isBullet = (line: string) => line.startsWith('- ') || line.startsWith('• ');

export function parseNote(note: string): NoteBlock[] {
  return note
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((raw): NoteBlock => {
      const line = raw.trim();
      if (!line) return { kind: 'gap' };
      if (isBullet(line)) return { kind: 'bullet', spans: parseInline(line.slice(2)) };
      return { kind: 'paragraph', spans: parseInline(line) };
    });
}

/** Texte sans marqueurs (aperçus compacts, agenda…). */
export function plainNote(note: string): string {
  return note
    .split('\n')
    .map((l) => l.trim().replace(INLINE, (_m, b, i) => b ?? i))
    .join('\n');
}

/** Résultat d'une action de la barre d'outils : nouveau texte + sélection à restaurer. */
export type NoteEdit = { value: string; start: number; end: number };

export function wrapSelection(value: string, start: number, end: number, marker: string): NoteEdit {
  return {
    value: value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end),
    start: start + marker.length,
    end: end + marker.length,
  };
}

export function toggleBullet(value: string, start: number, end: number): NoteEdit {
  const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  if (value.startsWith('- ', lineStart)) {
    return {
      value: value.slice(0, lineStart) + value.slice(lineStart + 2),
      start: Math.max(lineStart, start - 2),
      end: Math.max(lineStart, end - 2),
    };
  }
  return { value: `${value.slice(0, lineStart)}- ${value.slice(lineStart)}`, start: start + 2, end: end + 2 };
}
