import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { buildZoneUpdatePayload } from '@/lib/zones';

export interface ProfileSettings {
  createdAt: string | null;
  zoneCity: string | null;
  zoneDistrict: string | null;
  zoneLat: number | null;
  zoneLng: number | null;
  zoneRadiusKm: number;
  digestEmailEnabled: boolean;
  digestPushEnabled: boolean;
  /** Convention Postgres EXTRACT(DOW) : 0 = dimanche … 6 = samedi. */
  digestDay: number;
}

interface ProfileSettingsRow {
  created_at: string | null;
  zone_city: string | null;
  zone_district: string | null;
  zone_lat: number | null;
  zone_lng: number | null;
  zone_radius_km: number | null;
  digest_email_enabled: boolean | null;
  digest_push_enabled: boolean | null;
  digest_day: number | null;
}

/**
 * Zone (`zone_*`) et sélection hebdo (`digest_*`) du profil courant. Hook
 * dédié, séparé de `useAuth` : `AuthContext` est lu par toute l'app à chaque
 * render, un hook séparé évite un refetch/re-render global à chaque mise à
 * jour de ces réglages.
 */
export function useProfileSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['profile-settings', user?.id];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at, zone_city, zone_district, zone_lat, zone_lng, zone_radius_km, digest_email_enabled, digest_push_enabled, digest_day')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as ProfileSettingsRow;
    },
  });

  const settings: ProfileSettings | null = data
    ? {
        createdAt: data.created_at,
        zoneCity: data.zone_city,
        zoneDistrict: data.zone_district,
        zoneLat: data.zone_lat,
        zoneLng: data.zone_lng,
        zoneRadiusKm: data.zone_radius_km ?? 12,
        digestEmailEnabled: data.digest_email_enabled ?? false,
        digestPushEnabled: data.digest_push_enabled ?? false,
        digestDay: data.digest_day ?? 4,
      }
    : null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const updateZoneMutation = useMutation({
    mutationFn: async (input: { city: string; district: string | null; lat: number; lng: number; radiusKm: number }) => {
      const payload = buildZoneUpdatePayload(input);
      const { error } = await supabase.from('profiles').update(payload).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateDigestMutation = useMutation({
    mutationFn: async (input: { emailEnabled: boolean; pushEnabled: boolean; day: number }) => {
      const payload = {
        digest_email_enabled: input.emailEnabled,
        digest_push_enabled: input.pushEnabled,
        digest_day: input.day,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    settings,
    isLoading,
    updateZone: (input: { city: string; district: string | null; lat: number; lng: number; radiusKm: number }) =>
      updateZoneMutation.mutateAsync(input),
    updateDigest: (input: { emailEnabled: boolean; pushEnabled: boolean; day: number }) =>
      updateDigestMutation.mutateAsync(input),
    isSavingZone: updateZoneMutation.isPending,
    isSavingDigest: updateDigestMutation.isPending,
  };
}
