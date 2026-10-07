import { describe, expect, it } from 'vitest';
import { NANTES_ZONE, cityFromAddress, eventFarInfo, locationFarInfo, zoneFromSettings } from '@/lib/proximity';

// « Hors zone » = au-delà du rayon de la zone du profil, Nantes centre + 20 km sans profil.
// Un lieu ou une sortie sans coordonnées exploitables n'est jamais déclaré lointain.
describe('proximity', () => {
  it('sans profil, Nantes centre sert de repère', () => {
    expect(zoneFromSettings(null)).toEqual(NANTES_ZONE);
    expect(zoneFromSettings({ zoneLat: null, zoneLng: null, zoneRadiusKm: 12 })).toEqual(NANTES_ZONE);
    expect(locationFarInfo(NANTES_ZONE, { lat: 47.2184, lng: -1.5536 })).toBeNull();
  });

  it('Pornic est hors zone, avec ville et distance arrondie', () => {
    const far = locationFarInfo(NANTES_ZONE, { lat: 47.1146, lng: -2.1028, city: 'Pornic' });
    expect(far?.city).toBe('Pornic');
    expect(far?.km).toBeGreaterThanOrEqual(40);
    expect(far?.km).toBeLessThanOrEqual(50);
  });

  it('la zone du profil prime, rayon compris', () => {
    const zone = zoneFromSettings({ zoneLat: 47.1146, zoneLng: -2.1028, zoneRadiusKm: 12 });
    expect(locationFarInfo(zone, { lat: 47.1146, lng: -2.1028 })).toBeNull();
    expect(locationFarInfo(zone, { lat: 47.2184, lng: -1.5536 })).not.toBeNull();
  });

  it('« Nantes » n\'est cru que dans la métropole, l\'adresse prime sur la colonne', () => {
    expect(locationFarInfo(NANTES_ZONE, { lat: 46.4411, lng: -1.6637, city: 'Nantes' })?.city).toBeNull();
    expect(locationFarInfo(NANTES_ZONE, { lat: 47.4628, lng: -0.5605, city: 'Nantes', address: '9 Jardin Eblé 49000 Angers' })?.city).toBe('Angers');
    expect(locationFarInfo(NANTES_ZONE, { lat: 47.3754, lng: -1.202, address: '1090 bd de la prairie 44150 ancenis saint gereon' })?.city).toBe('Ancenis Saint Gereon');
    const profileZone = zoneFromSettings({ zoneLat: 47.1146, zoneLng: -2.1028, zoneRadiusKm: 12 });
    expect(locationFarInfo(profileZone, { lat: 47.2184, lng: -1.5536, city: 'Nantes' })?.city).toBe('Nantes');
  });

  // Cas communs aux 3 plateformes (mêmes cas dans proximity_zone_test.dart) : gardent la logique alignée.
  it("adresses : « , France » et « Cedex » tolérés, casse remise", () => {
    expect(cityFromAddress('1 quai, 44210 Pornic, France')).toBe('Pornic');
    expect(cityFromAddress('Place Royale, 44000 Nantes Cedex 1')).toBe('Nantes');
    expect(cityFromAddress('4 rue X, 44210 PORNIC')).toBe('Pornic');
    expect(cityFromAddress('Le Bernard, Pays De La Loire, France 85560')).toBeNull();
  });

  it('un lieu à 0,0 n\'est jamais déclaré lointain', () => {
    expect(locationFarInfo(NANTES_ZONE, { lat: 0, lng: 0 })).toBeNull();
  });

  it("une ville vide ne s'affiche pas", () => {
    expect(locationFarInfo(NANTES_ZONE, { lat: 47.1146, lng: -2.1028, city: '  ' })?.city).toBeNull();
  });

  it("sortie : ville lue en fin d'adresse, coordonnées absentes ignorées", () => {
    expect(cityFromAddress('1 quai, 44210 Pornic')).toBe('Pornic');
    expect(cityFromAddress('Place du Commerce')).toBeNull();
    expect(eventFarInfo(NANTES_ZONE, { lat: 47.1146, lng: -2.1028, address: '1 quai, 44210 Pornic' })?.city).toBe('Pornic');
    expect(eventFarInfo(NANTES_ZONE, { lat: null, lng: null })).toBeNull();
    expect(eventFarInfo(NANTES_ZONE, { lat: 0, lng: 0 })).toBeNull();
  });
});
