import { describe, it, expect } from 'vitest';
import { ZoneReference, buildZoneUpdatePayload, radiusForZoneChange } from '@/lib/zones';

describe('buildZoneUpdatePayload — piège zone_district', () => {
  it('inclut toujours la clé zone_district, même quand district est null', () => {
    const payload = buildZoneUpdatePayload({ city: 'Nantes', district: null, lat: 47.2, lng: -1.5, radiusKm: 12 });
    // Object.keys, pas juste une assertion de valeur : une construction
    // conditionnelle (`...(district ? {...} : {})`) omettrait la clé sans que
    // `payload.zone_district === null` suffise à le détecter (elle vaudrait
    // `undefined`, indistinguable de `null` avec `toBe`/`toEqual` seuls).
    expect(Object.keys(payload)).toContain('zone_district');
    expect(payload.zone_district).toBeNull();
  });

  it('transporte bien un quartier choisi', () => {
    const payload = buildZoneUpdatePayload({
      city: 'Nantes',
      district: 'Bellevue - Chantenay - Sainte-Anne',
      lat: 47.22,
      lng: -1.58,
      radiusKm: 20,
    });
    expect(payload.zone_district).toBe('Bellevue - Chantenay - Sainte-Anne');
    expect(payload.zone_city).toBe('Nantes');
  });
});

describe('radiusForZoneChange', () => {
  const zones: ZoneReference[] = [
    { label: 'Nantes', kind: 'commune', lat: 47.2184, lng: -1.5536 },
    { label: 'Pays de Retz', kind: 'secteur', lat: 46.9928, lng: -1.8226 },
  ];

  it('élargit à 30km un rayon plus petit quand on choisit un secteur', () => {
    expect(radiusForZoneChange(zones, 'Pays de Retz', 12)).toBe(30);
  });

  it("ne rétrécit jamais un rayon déjà plus grand que 30km sur un secteur", () => {
    expect(radiusForZoneChange(zones, 'Pays de Retz', 50)).toBe(50);
  });

  it('ne touche pas au rayon pour une commune', () => {
    expect(radiusForZoneChange(zones, 'Nantes', 12)).toBe(12);
  });
});
