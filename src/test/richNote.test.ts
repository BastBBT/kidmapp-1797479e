import { describe, expect, it } from 'vitest';
import { parseInline, parseNote, plainNote, toggleBullet, wrapSelection } from '@/lib/richNote';

describe('parseInline', () => {
  it('gère gras, italique et imbrication', () => {
    expect(parseInline('a **b** *c* **d *e* f**')).toEqual([
      { text: 'a ', bold: false, italic: false },
      { text: 'b', bold: true, italic: false },
      { text: ' ', bold: false, italic: false },
      { text: 'c', bold: false, italic: true },
      { text: ' ', bold: false, italic: false },
      { text: 'd ', bold: true, italic: false },
      { text: 'e', bold: true, italic: true },
      { text: ' f', bold: true, italic: false },
    ]);
  });
  it("laisse les astérisques isolés (3 * 4 * 5) et ne crée aucun lien", () => {
    expect(parseInline('3 * 4 * 5')).toEqual([{ text: '3 * 4 * 5', bold: false, italic: false }]);
    expect(parseInline('[x](http://evil)')[0].text).toBe('[x](http://evil)');
  });
});

describe('parseNote / plainNote', () => {
  it('reconnaît listes et lignes vides', () => {
    expect(parseNote('Salut\n\n- un\n• deux').map((b) => b.kind)).toEqual(['paragraph', 'gap', 'bullet', 'bullet']);
  });
  it('retire les marqueurs', () => {
    expect(plainNote('**gras** et *italique*\n- item')).toBe('gras et italique\n- item');
  });
});

describe('barre d\'outils', () => {
  it('entoure la sélection et la conserve', () => {
    expect(wrapSelection('Atelier parents', 8, 15, '**')).toEqual({ value: 'Atelier **parents**', start: 10, end: 17 });
  });
  it('ajoute / retire la puce de la ligne courante', () => {
    expect(toggleBullet('a\nb', 2, 3)).toEqual({ value: 'a\n- b', start: 4, end: 5 });
    expect(toggleBullet('a\n- b', 4, 5)).toEqual({ value: 'a\nb', start: 2, end: 3 });
  });
});
