import { describe, expect, it } from 'vitest';
import { reviewReasons, reviewStateOf } from '@/lib/eventReview';

describe('reviewStateOf', () => {
  it('drapeaux présents → à vérifier', () => {
    expect(reviewStateOf({ review_flags: ['tarif_ambigu'], review_checked_at: '2026-10-12T10:00:00Z' })).toBe('flagged');
  });
  it('évalué sans drapeau → rien à vérifier', () => {
    expect(reviewStateOf({ review_flags: [], review_checked_at: '2026-10-12T10:00:00Z' })).toBe('clear');
  });
  it('jamais évalué → non évalué, même sans drapeau', () => {
    expect(reviewStateOf({ review_flags: [], review_checked_at: null })).toBe('unchecked');
    expect(reviewStateOf({})).toBe('unchecked');
  });
});

describe('reviewReasons', () => {
  it('associe chaque ligne « code : explication » à son drapeau', () => {
    const reasons = reviewReasons({
      review_flags: ['lien_source', 'doublon_possible'],
      review_detail: 'lien_source : redirige vers l’accueil\n• doublon_possible : « Enfantines » le 22/10',
    });
    expect(reasons).toEqual([
      { code: 'lien_source', label: 'Lien source', detail: 'redirige vers l’accueil' },
      { code: 'doublon_possible', label: 'Doublon possible', detail: '« Enfantines » le 22/10' },
    ]);
  });
  it('garde un drapeau sans explication et une ligne sans code', () => {
    const reasons = reviewReasons({ review_flags: ['hors_zone'], review_detail: 'texte libre' });
    expect(reasons).toEqual([
      { code: 'hors_zone', label: 'Hors zone / géocodage douteux', detail: null },
      { code: null, label: 'Note du bot', detail: 'texte libre' },
    ]);
  });
  it('ne crée pas de raison pour un code de ligne absent des drapeaux', () => {
    const reasons = reviewReasons({ review_flags: [], review_detail: 'tarif_ambigu : prix absent' });
    expect(reasons).toEqual([{ code: null, label: 'Note du bot', detail: 'tarif_ambigu : prix absent' }]);
  });
});
