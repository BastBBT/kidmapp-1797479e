import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localeOf } from '@/lib/formatDate';
import {
  WEEK_DISPLAY_ORDER,
  dayName,
  formatTime,
  openStatus,
  parseOpeningHours,
  rangesForDay,
  todayInParis,
  type OpenStatus,
} from '@/lib/openingHours';

/**
 * Horaires d'ouverture de la fiche lieu : statut « Ouvert / Fermé » calculé à l'heure de Paris,
 * semaine dépliable (dépliée quand c'est ouvert, repliée sinon) et date de vérification.
 * Sans horaires : une ligne « Horaires non communiqués », jamais de blocage du reste de la fiche.
 * Miroir du bloc « Horaires » d'iOS et Android.
 */
interface Props {
  openingHours: unknown;
  source: string | null | undefined;
  updatedAt: string | null | undefined;
}

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const LocationOpeningHours = ({ openingHours, source, updatedAt }: Props) => {
  const { t, i18n } = useTranslation();
  const locale = localeOf(i18n.language);
  const hours = useMemo(() => parseOpeningHours(openingHours), [openingHours]);
  const status = useMemo(() => (hours ? openStatus(hours) : null), [hours]);
  const isOpen = status?.kind === 'open' || status?.kind === 'always_open';
  const [expanded, setExpanded] = useState(isOpen);

  const title = (
    <h2 className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
      {t('location_page.hours_title')}
    </h2>
  );

  if (!hours || !status) {
    return (
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        {title}
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{t('location_page.hours_unknown')}</p>
      </div>
    );
  }

  const detail = statusDetail(status, t, locale);
  const today = todayInParis();
  const verified = updatedAt
    ? new Date(updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}
      >
        {title}
        <ChevronDown open={expanded} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
          background: isOpen ? '#EBF4F2' : '#FAF0EC',
          color: isOpen ? '#3B7D6E' : 'var(--primary)',
        }}>
          {isOpen ? t('location_page.hours_open') : t('location_page.hours_closed')}
        </span>
        {detail && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{detail}</span>}
      </div>

      {expanded && status.kind !== 'always_open' && (
        <table style={{ width: '100%', marginTop: 12, fontSize: 14, borderCollapse: 'collapse' }}>
          <tbody>
            {WEEK_DISPLAY_ORDER.map((day) => {
              const ranges = rangesForDay(hours, day);
              const isToday = day === today;
              return (
                <tr key={day} style={{ fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--text)' : 'var(--text-muted)' }}>
                  <td style={{ padding: '3px 0', textTransform: 'capitalize', verticalAlign: 'top' }}>{dayName(day, locale)}</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>
                    {ranges.length > 0 ? ranges.join(', ') : t('location_page.hours_closed')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {verified && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
          {t('location_page.hours_verified', { date: verified })}
          {source === 'google_auto' && ` · ${t('location_page.hours_source_google')}`}
        </p>
      )}
    </div>
  );
};

function statusDetail(status: OpenStatus, t: (k: string, o?: Record<string, string>) => string, locale: string): string {
  switch (status.kind) {
    case 'always_open':
      return t('location_page.hours_always_open');
    case 'open': {
      const time = formatTime(status.closesAt);
      if (status.closesInDays === 0) return t('location_page.hours_until', { time });
      if (status.closesInDays === 1) return t('location_page.hours_until_tomorrow', { time });
      return t('location_page.hours_until_day', { time, day: dayName(status.closesAt.day, locale) });
    }
    case 'closed': {
      const time = formatTime(status.opensAt);
      if (status.opensInDays === 0) return t('location_page.hours_opens_today', { time });
      if (status.opensInDays === 1) return t('location_page.hours_opens_tomorrow', { time });
      return t('location_page.hours_opens_day', { time, day: dayName(status.opensAt.day, locale) });
    }
    case 'closed_indefinitely':
      return '';
  }
}

export default LocationOpeningHours;
