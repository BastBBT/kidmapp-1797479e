// Liens web venant de la base : seuls http(s) s'ouvrent. Mêmes cas que `webLink()` côté Android
// (test/web_link_test.dart) et `URL.webLink(from:)` côté iOS.
import { describe, expect, it } from 'vitest';
import { webLink } from '@/lib/webLink';
import { buildIcs } from '@/lib/ics';
import { galleryMedia, reelCoverPhoto } from '@/lib/gallery';
import type { EventItem } from '@/types/event';

describe('webLink accepte', () => {
  it.each([
    ['https://exemple.fr/resa?a=1', 'https://exemple.fr/resa?a=1'],
    ['bistrotkiwaa.fr', 'https://bistrotkiwaa.fr/'],
    ['www.x.fr/a?b=1', 'https://www.x.fr/a?b=1'],
    ['  https://a.fr  ', 'https://a.fr/'],
    ['www.tiktok.com/@compte', 'https://www.tiktok.com/@compte'],
    ['site.fr/?h=12:30', 'https://site.fr/?h=12:30'],
    ['site.fr/#a:b', 'https://site.fr/#a:b'],
    ['site.fr:8080/x', 'https://site.fr:8080/x'],
    ['a-b.fr', 'https://a-b.fr/'],
    ['http://192.168.1.1:3000/', 'http://192.168.1.1:3000/'],
  ])('« %s »', (raw, expected) => expect(webLink(raw)).toBe(expected));

  it('un nom de domaine accentué', () => expect(webLink('bücher.de')).not.toBeNull());
  it('le schéma en casse mixte', () => expect(webLink('HTTP://Exemple.fr')).toBe('http://exemple.fr/'));
});

describe('webLink refuse', () => {
  // Valeurs réelles trouvées en base dans `booking_url` / `website`, puis schémas hostiles.
  it.each([
    'evenement@pleincentre.net',
    'sans réservation',
    '📞 Prise de rendez-vous par téléphone au : 02 40 63 30 40',
    'tel:0240633040',
    'sms:0600000000',
    'mailto:a@b.fr',
    'market://details?id=x',
    'itms-apps://apps.apple.com/x',
    'javascript://x',
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'intent://scan/#Intent;scheme=zxing;end',
    'https://',
    'localhost',
    'localhost:8080',
    // Numéros, heures, prix et ponctuation : des points, mais pas un nom de domaine.
    '02.40.63.30.40',
    '10.30',
    'v1.2',
    'Contact.',
    '12.50€',
    '12.50 €',
    // Dernière étiquette trop courte ou non alphabétique, étiquettes vides ou mal formées.
    'site.f',
    '.fr',
    'a..fr',
    '-a.fr',
    // Identifiants : l'hôte réellement ouvert n'est pas celui qu'on croit lire.
    'https://trusted.com@evil.com/',
    'trusted.com@evil.com',
    'user:pass@host.fr',
    // Schéma collé ou barres inversées : la grammaire WHATWG les rendrait ouvrables.
    'https:evil.com',
    'http:\\\\evil.com',
    '',
    '   ',
  ])('« %s »', (raw) => expect(webLink(raw)).toBeNull());

  it('null et undefined', () => {
    expect(webLink(null)).toBeNull();
    expect(webLink(undefined)).toBeNull();
  });
});

describe('galerie : reel inexploitable', () => {
  const loc = (reel_url: string | null) => ({ photo: 'a.jpg', photos: [], reel_url });

  it('un reel_url qui n\'est pas un lien web ne donne aucune diapo ni couverture', () => {
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

  it('un site exploitable part dans l\'agenda, normalisé', () => {
    expect(buildIcs(ev('exemple.fr/atelier'))).toContain('URL:https://exemple.fr/atelier');
  });

  it('une adresse e-mail ou une phrase ne part pas dans `URL:`', () => {
    expect(buildIcs(ev('contact@exemple.fr'))).not.toContain('URL:');
    expect(buildIcs(ev('sans réservation'))).not.toContain('URL:');
  });
});
