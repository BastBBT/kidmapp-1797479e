import { describe, expect, it } from 'vitest';
import { directionsUrl } from '@/lib/directions';

describe('directionsUrl', () => {
  it('pointe vers l’itinéraire Google Maps de la destination', () => {
    expect(directionsUrl(47.2168737, -1.5553894)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=47.2168737,-1.5553894',
    );
  });
});
