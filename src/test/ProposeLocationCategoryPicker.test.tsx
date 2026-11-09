import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Garde-fou : le sélecteur de catégorie du formulaire de proposition avait
// affiché du code en clair (expression JSX sans accolades), invisible pour tsc.
describe('ProposeLocationModal — sélecteur de catégorie', () => {
  const src = readFileSync('src/components/ProposeLocationModal.tsx', 'utf8');
  it('l\'expression icône/emoji est entre accolades JSX', () => {
    expect(src).toMatch(/\{CATEGORY_ICONS\[c\.id\]\s*\n?\s*\?/);
    expect(src).not.toMatch(/>\s*\n\s*CATEGORY_ICONS\[c\.id\]/);
  });
});
