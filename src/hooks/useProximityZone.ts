import { useMemo } from 'react';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { ProximityZone, zoneFromParts } from '@/lib/proximity';

/**
 * Zone de proximité du compte courant (Nantes centre + 20 km sans profil ni zone) :
 * base des badges « hors zone » et du filtre « Proche de moi ».
 */
export function useProximityZone(): ProximityZone {
  const { settings } = useProfileSettings();
  const lat = settings?.zoneLat;
  const lng = settings?.zoneLng;
  const radiusKm = settings?.zoneRadiusKm;
  return useMemo(() => zoneFromParts(lat, lng, radiusKm), [lat, lng, radiusKm]);
}
