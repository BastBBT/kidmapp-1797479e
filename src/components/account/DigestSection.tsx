import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import DisclosureSection from './DisclosureSection';
import {
  DIGEST_DAYS_OPTIONS,
  EVENT_CATEGORIES,
  LOCATION_CATEGORIES,
  isCategoryOn,
  toggleCategory,
  type DigestDays,
} from '@/lib/digestPreferences';
import type { DigestPreferencesPatch } from '@/hooks/useProfileSettings';

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

const dividerStyle: React.CSSProperties = { height: 1, background: 'var(--border)', margin: '18px 0 14px' };

const linkButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
  fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: 'var(--secondary)',
};

function chipStyle(on: boolean): React.CSSProperties {
  return {
    minHeight: 34, padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
    fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
    background: on ? 'var(--secondary)' : 'var(--surface)',
    color: on ? '#fff' : 'var(--text-muted)',
    border: on ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)',
  };
}

/** Prochaines vacances (ou en cours) de la zone B, pour le libellé sous
 *  l'interrupteur — lues en base plutôt qu'écrites en dur, pour ne pas se
 *  périmer d'une année sur l'autre. */
function useNextSchoolHoliday() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['next-school-holiday', today],
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_holidays')
        .select('first_day, last_day')
        .eq('zone', 'B')
        .gte('last_day', today)
        .order('first_day')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Section "Ma sélection hebdo" de Mon compte — repliable, résumé visible même fermée. */
interface DigestSectionProps {
  /** Contrôlé par Mon compte pour que la bannière de relance puisse déplier
   *  cette section. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DigestSection = ({ open, onOpenChange }: DigestSectionProps) => {
  const { t, i18n } = useTranslation();
  const { settings, updateDigest, updatePreferences, isSavingDigest } = useProfileSettings();
  const { data: nextHoliday } = useNextSchoolHoliday();
  const formatDay = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const todayISO = new Date().toISOString().slice(0, 10);
  const holidaysHint = !nextHoliday
    ? t('account.digest_holidays_hint')
    : nextHoliday.first_day <= todayISO
      ? t('account.digest_holidays_hint_current', { end: formatDay(nextHoliday.last_day) })
      : t('account.digest_holidays_hint_upcoming', { start: formatDay(nextHoliday.first_day), end: formatDay(nextHoliday.last_day) });

  const savePreferences = async (patch: DigestPreferencesPatch) => {
    if (!settings) return;
    try {
      await updatePreferences(patch);
    } catch (e) {
      console.error('update digest preferences failed', e);
    }
  };

  const digestDays: DigestDays = settings?.digestDays ?? 'all';
  const holidaysAllWeek = settings?.digestHolidaysAllWeek ?? true;
  const eventCategories = settings?.digestEventCategories ?? null;
  const locationCategories = settings?.alertLocationCategories ?? null;

  const dayLabel = t(`account.digest_weekday_long.${settings?.digestDay ?? 4}`);
  const recap = t('account.digest_recap', {
    day: dayLabel,
    when: t(`account.digest_recap_when.${digestDays}`),
    holidays: digestDays !== 'all' && holidaysAllWeek ? t('account.digest_recap_holidays') : '',
    events: eventCategories
      ? t('account.digest_recap_events_some', { count: eventCategories.length, total: EVENT_CATEGORIES.length })
      : t('account.digest_recap_events_all'),
    places: t('account.digest_recap_places', {
      count: locationCategories?.length ?? LOCATION_CATEGORIES.length,
      total: LOCATION_CATEGORIES.length,
    }),
  });
  const summaryBase = settings?.digestEmailEnabled ? t('account.digest_summary_email') : t('account.digest_summary_none');
  const summary = settings?.digestEmailEnabled && digestDays !== 'all'
    ? `${summaryBase} · ${t(`account.digest_days_short.${digestDays}`)}`
    : summaryBase;

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
        open={open}
        onOpenChange={onOpenChange}
        summary={summary}
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

        <div style={dividerStyle} />

        <label style={labelStyle}>{t('account.digest_days_label')}</label>
        <div role="radiogroup" aria-label={t('account.digest_days_label')} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DIGEST_DAYS_OPTIONS.map((option) => {
            const active = digestDays === option;
            return (
              <button
                key={option}
                role="radio"
                aria-checked={active}
                onClick={() => savePreferences({ digest_days: option })}
                disabled={!settings}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  padding: '10px 12px', minHeight: 50, borderRadius: 12, cursor: 'pointer',
                  background: active ? 'var(--primary-light)' : 'var(--surface)',
                  border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18, height: 18, boxSizing: 'border-box', borderRadius: 9, flexShrink: 0,
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {active && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary)' }} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {t(`account.digest_days_option.${option}`)}
                  </span>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
                    {t(`account.digest_days_option_sub.${option}`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {digestDays !== 'all' && (
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, padding: 12,
              borderRadius: 12, background: 'var(--accent-light)', cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('account.digest_holidays_label')}
              </span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {holidaysHint}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={holidaysAllWeek}
              onChange={(e) => savePreferences({ digest_holidays_all_week: e.target.checked })}
              disabled={!settings}
              style={{ width: 20, height: 20, accentColor: 'var(--secondary)' }}
            />
          </label>
        )}

        <div style={dividerStyle} />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>{t('account.digest_event_categories_label')}</span>
          <button style={linkButtonStyle} onClick={() => savePreferences({ digest_event_categories: null })} disabled={!settings}>
            {t('account.digest_check_all')}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EVENT_CATEGORIES.map((cat) => {
            const on = isCategoryOn(eventCategories, cat);
            return (
              <button
                key={cat}
                aria-pressed={on}
                disabled={!settings}
                onClick={() => savePreferences({ digest_event_categories: toggleCategory(eventCategories, EVENT_CATEGORIES, cat) })}
                style={chipStyle(on)}
              >
                {t(`category_event.${cat}`)}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 6px' }}>
          <span style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>{t('account.digest_location_categories_label')}</span>
          <button style={linkButtonStyle} onClick={() => savePreferences({ alert_location_categories: null })} disabled={!settings}>
            {t('account.digest_check_all')}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LOCATION_CATEGORIES.map((cat) => {
            const on = isCategoryOn(locationCategories, cat);
            return (
              <button
                key={cat}
                aria-pressed={on}
                disabled={!settings}
                onClick={() => savePreferences({ alert_location_categories: toggleCategory(locationCategories, LOCATION_CATEGORIES, cat) })}
                style={chipStyle(on)}
              >
                {t(`category_place.${cat}`)}
              </button>
            );
          })}
        </div>

        {settings?.digestEmailEnabled && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'var(--secondary-light)' }}>
            <div style={{ ...labelStyle, color: 'var(--secondary)', marginBottom: 4 }}>{t('account.digest_recap_title')}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{recap}</div>
          </div>
        )}
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
