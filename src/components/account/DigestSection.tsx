import { useTranslation } from 'react-i18next';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import DisclosureSection from './DisclosureSection';

// L→D à l'affichage ; la valeur stockée reste la convention Postgres
// EXTRACT(DOW) : 0 = dimanche … 6 = samedi.
const WEEKDAYS: { label: string; dow: number }[] = [
  { label: 'weekday.mon', dow: 1 },
  { label: 'weekday.tue', dow: 2 },
  { label: 'weekday.wed', dow: 3 },
  { label: 'weekday.thu', dow: 4 },
  { label: 'weekday.fri', dow: 5 },
  { label: 'weekday.sat', dow: 6 },
  { label: 'weekday.sun', dow: 0 },
];

const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans', fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6,
};

/** Section "Ma sélection hebdo" de Mon compte — repliable, résumé visible même fermée. */
const DigestSection = () => {
  const { t } = useTranslation();
  const { settings, updateDigest, isSavingDigest } = useProfileSettings();

  const handleDigestChange = async (patch: Partial<{ emailEnabled: boolean; day: number }>) => {
    if (!settings) return;
    try {
      await updateDigest({
        emailEnabled: patch.emailEnabled ?? settings.digestEmailEnabled,
        pushEnabled: settings.digestPushEnabled,
        day: patch.day ?? settings.digestDay,
      });
    } catch (e) {
      console.error('update digest failed', e);
    }
  };

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <DisclosureSection
        title={t('account.digest_title')}
        summary={settings?.digestEmailEnabled ? t('account.digest_summary_email') : t('account.digest_summary_none')}
      >
        <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
          {t('account.digest_context')}
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings?.digestEmailEnabled ?? false}
            onChange={(e) => handleDigestChange({ emailEnabled: e.target.checked })}
            disabled={!settings}
          />
          <span style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)' }}>{t('account.digest_email_label')}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, opacity: 0.6 }}>
          <input type="checkbox" checked={false} disabled />
          <span style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)' }}>{t('account.digest_push_label')}</span>
        </label>

        <label style={labelStyle}>{t('account.digest_day_label')}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {WEEKDAYS.map((wd) => {
            const active = settings?.digestDay === wd.dow;
            return (
              <button
                key={wd.dow}
                onClick={() => handleDigestChange({ day: wd.dow })}
                disabled={!settings}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10,
                  border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'var(--primary-light)' : 'var(--surface)',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t(wd.label)}
              </button>
            );
          })}
        </div>
        {isSavingDigest && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {t('account.zone_saving')}
          </div>
        )}
      </DisclosureSection>
    </div>
  );
};

export default DigestSection;
