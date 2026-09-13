import { useTranslation } from 'react-i18next';
import { useZoneReference } from '@/hooks/useZoneReference';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { radiusForZoneChange, zoneMenuLabel } from '@/lib/zones';
import DisclosureSection from './DisclosureSection';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50];

const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans', fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--bg)',
  fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)', marginBottom: 14,
};

/** Section "Ma zone" de Mon compte — repliable, résumé visible même fermée. */
const ZoneSection = () => {
  const { t } = useTranslation();
  const { communes, quartiers, secteurs, zones } = useZoneReference();
  const { settings, updateZone, isSavingZone } = useProfileSettings();

  // Changement de zone (commune/secteur OU quartier) : recalcule le rayon
  // via `radiusForZoneChange` (secteur -> min 30km) et résout le point via la
  // ligne dont le label == quartier si présent, sinon la commune — jamais au
  // changement de rayon seul, qui n'appelle que `updateZone` directement.
  const handleZoneChange = async (nextCity: string, nextDistrict: string | null) => {
    const effectiveLabel = nextDistrict ?? nextCity;
    const point = zones.find((z) => z.label === effectiveLabel);
    if (!point) return;
    const currentRadius = settings?.zoneRadiusKm ?? 12;
    const radiusKm = radiusForZoneChange(zones, effectiveLabel, currentRadius);
    try {
      await updateZone({ city: nextCity, district: nextDistrict, lat: point.lat, lng: point.lng, radiusKm });
    } catch (e) {
      console.error('update zone failed', e);
    }
  };

  const handleRadiusChange = async (radiusKm: number) => {
    if (!settings?.zoneCity) return;
    try {
      await updateZone({
        city: settings.zoneCity,
        district: settings.zoneDistrict,
        lat: settings.zoneLat ?? 0,
        lng: settings.zoneLng ?? 0,
        radiusKm,
      });
    } catch (e) {
      console.error('update radius failed', e);
    }
  };

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <DisclosureSection
        title={t('account.zone_title')}
        summary={settings?.zoneDistrict ?? settings?.zoneCity ?? t('account.zone_unset')}
      >
        <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
          {t('account.zone_context')}
        </p>

        <label style={labelStyle}>{t('account.zone_commune_label')}</label>
        <select
          value={settings?.zoneCity ?? ''}
          onChange={(e) => handleZoneChange(e.target.value, null)}
          disabled={!settings}
          style={selectStyle}
        >
          {!settings?.zoneCity && <option value="">{t('account.zone_choose')}</option>}
          {communes.map((z) => (
            <option key={z.label} value={z.label}>{z.label}</option>
          ))}
          {secteurs.length > 0 && (
            <optgroup label={t('account.zone_sector_group')}>
              {secteurs.map((z) => (
                <option key={z.label} value={z.label}>{zoneMenuLabel(z)}</option>
              ))}
            </optgroup>
          )}
        </select>

        {settings?.zoneCity === 'Nantes' && quartiers.length > 0 && (
          <>
            <label style={labelStyle}>{t('account.zone_district_label')}</label>
            <select
              value={settings?.zoneDistrict ?? ''}
              onChange={(e) => handleZoneChange(settings!.zoneCity!, e.target.value || null)}
              style={selectStyle}
            >
              <option value="">{t('account.zone_district_none')}</option>
              {quartiers.map((z) => (
                <option key={z.label} value={z.label}>{z.label}</option>
              ))}
            </select>
          </>
        )}

        <label style={labelStyle}>{t('account.zone_radius_label')}</label>
        <select
          value={settings?.zoneRadiusKm ?? 12}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          disabled={!settings?.zoneCity}
          style={{ ...selectStyle, marginBottom: 0 }}
        >
          {(RADIUS_OPTIONS.includes(settings?.zoneRadiusKm ?? 12)
            ? RADIUS_OPTIONS
            : [...RADIUS_OPTIONS, settings?.zoneRadiusKm ?? 12].sort((a, b) => a - b)
          ).map((km) => (
            <option key={km} value={km}>{km} km</option>
          ))}
        </select>
        {isSavingZone && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {t('account.zone_saving')}
          </div>
        )}
      </DisclosureSection>
    </div>
  );
};

export default ZoneSection;
