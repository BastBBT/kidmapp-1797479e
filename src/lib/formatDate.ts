import i18n from '@/i18n';

export const localeOf = (lng?: string): string => {
  const l = (lng ?? i18n.language ?? 'fr').split('-')[0];
  if (l === 'en') return 'en-US';
  if (l === 'es') return 'es-ES';
  return 'fr-FR';
};

export const formatDateShort = (d: string | Date): string =>
  new Date(d).toLocaleDateString(localeOf(), { day: 'numeric', month: 'short' });

export const formatDateLong = (d: string | Date): string =>
  new Date(d).toLocaleDateString(localeOf(), { weekday: 'long', day: 'numeric', month: 'long' });

export const formatMonthShort = (d: Date): string =>
  d.toLocaleDateString(localeOf(), { month: 'short' }).replace('.', '');

export const formatEventDateRange = (
  start: string,
  end: string | null,
  time: string | null,
  past: boolean,
): string => {
  const startStr = formatDateShort(start);
  const finished = i18n.t('event.finished', { defaultValue: 'Terminé' });
  if (!end || end === start) {
    if (past) return `${startStr} · ${finished}`;
    return time ? `${startStr} · ${time}` : startStr;
  }
  const range = `${startStr} → ${formatDateShort(end)}`;
  return past ? `${range} · ${finished}` : range;
};

export const formatRelativeDate = (input: string | Date): string => {
  const d = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  const dayMs = 86400000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startToday - startDate) / dayMs);

  if (dayDiff <= 0) return i18n.t('common.today');
  if (dayDiff === 1) return i18n.t('common.yesterday');
  if (dayDiff < 7) return i18n.t('common.days_ago', { count: dayDiff });
  if (dayDiff < 30) {
    const w = Math.floor(dayDiff / 7);
    return i18n.t('common.weeks_ago', { count: w });
  }
  const m = Math.floor(dayDiff / 30);
  return i18n.t('common.months_ago', { count: m });
};
