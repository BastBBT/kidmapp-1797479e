// Liens web venant de la base : seuls les http(s) exploitables s'ouvrent. Le tableau de cas est
// partagé avec Android (test/fixtures/web_link_cases.json) et iOS (scripts/web_link_cases.json) :
// mêmes entrées, mêmes URL canoniques attendues, vérifiées sur les trois plateformes.
import { describe, expect, it } from 'vitest';
import { webLink, webLinkInputError } from '@/lib/webLink';
import { buildIcs } from '@/lib/ics';
import { galleryMedia, reelCoverPhoto } from '@/lib/gallery';
import type { EventItem } from '@/types/event';
import table from './fixtures/webLinkCases.json';

const cases = table.cases as { in: string; out: string | null }[];

describe('webLink : tableau partagé', () => {
  const show = (s: string) => JSON.stringify(s).slice(0, 70);
  it.each(cases.filter((c) => c.out !== null))('accepte %j', (c) => expect(webLink(c.in)).toBe(c.out));
  it.each(cases.filter((c) => c.out === null).map((c) => ({ ...c, label: show(c.in) })))('refuse $label', (c) =>
    expect(webLink(c.in)).toBeNull(),
  );

  it('null et undefined', () => {
    expect(webLink(null)).toBeNull();
    expect(webLink(undefined)).toBeNull();
  });

  it('est idempotent : une URL canonique reste elle-même', () => {
    for (const c of cases.filter((c) => c.out !== null)) expect(webLink(c.out)).toBe(c.out);
  });
});

describe('saisie : webLinkInputError', () => {
  it('champ vide ou lien exploitable : pas d\'erreur', () => {
    expect(webLinkInputError('')).toBeNull();
    expect(webLinkInputError('   ')).toBeNull();
    expect(webLinkInputError('\u200b')).toBeNull();
    expect(webLinkInputError(' \u200b\ufeff ')).toBeNull();
    expect(webLinkInputError('monsite.fr')).toBeNull();
    expect(webLinkInputError('https://monsite.fr/resa')).toBeNull();
  });

  it('lien que la fiche masquerait : message de saisie', () => {
    for (const raw of ['evenement@pleincentre.net', 'sans réservation', '02.40.63.30.40', 'javascript:alert(1)']) {
      expect(webLinkInputError(raw), raw).toBe('URL invalide (ex : monsite.fr ou https://monsite.fr)');
    }
  });
});

describe('galerie : reel inexploitable', () => {
  const loc = (reel_url: string | null) => ({ photo: 'a.jpg', photos: [], reel_url });

  it("un reel_url qui n'est pas un lien web ne donne aucune diapo ni couverture", () => {
    for (const raw of ['sans lien', 'tel:0240633040', 'contact@exemple.fr', 'javascript:alert(1)']) {
      expect(galleryMedia(loc(raw)).some((m) => m.reelUrl), raw).toBe(false);
      expect(reelCoverPhoto(loc(raw)), raw).toBeNull();
    }
  });

  it('un lien Instagram valide reste en dernière position', () => {
    const media = galleryMedia(loc('https://www.instagram.com/reel/abc/'));
    expect(media[media.length - 1].reelUrl).toBe('https://www.instagram.com/reel/abc/');
  });
});

describe('export calendrier : URL', () => {
  const ev = (website: string | null) =>
    ({ id: 'e1', name: 'Atelier', date_start: '2026-10-17', date_end: null, time: null, address: null, website, note: null }) as unknown as EventItem;

  it("un site exploitable part dans l'agenda, canonique", () => {
    expect(buildIcs(ev('exemple.fr/atelier'))).toContain('URL:https://exemple.fr/atelier');
  });

  it("l'URL n'est pas échappée comme du texte : `,` et `;` restent intacts (type URI)", () => {
    expect(buildIcs(ev('exemple.fr/?a=1,2;b=3'))).toContain('URL:https://exemple.fr/?a=1,2;b=3');
  });

  it('une adresse e-mail ou une phrase ne part pas dans `URL:`', () => {
    expect(buildIcs(ev('contact@exemple.fr'))).not.toContain('URL:');
    expect(buildIcs(ev('sans réservation'))).not.toContain('URL:');
  });
});
