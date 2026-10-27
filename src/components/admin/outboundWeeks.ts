import { isActivity } from '@/types/location';

export type LinkType = 'website' | 'booking';
export type ClickGroup = 'events' | 'places' | 'activities';

/** Un clic sortant, enrichi du nom et de la catégorie courante de la fiche. */
export type ClickRow = {
  entityType: 'location' | 'event';
  entityId: string;
  linkType: LinkType;
  category: string | null;
  name: string | null;
  /** Horodatage en ms (parsé une fois pour toutes). */
  t: number;
};

export type Week = { start: Date; end: Date };

export type RankedRow = {
  key: string;
  entityType: 'location' | 'event';
  entityId: string;
  linkType: LinkType;
  name: string | null;
  category: string | null;
  count: number;
};

/** Lundi 00:00 (heure locale) de la semaine qui contient `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // lundi = 0
  out.setDate(out.getDate() - dow);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** `count` semaines lundi→dimanche, de la plus ancienne à celle qui contient `now`. `end` est exclusif. */
export function buildWeeks(now: Date, count: number): Week[] {
  const current = weekStart(now);
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(current, -7 * (count - 1 - i));
    return { start, end: addDays(start, 7) };
  });
}

export const isCurrentWeek = (w: Week, now: Date) => now >= w.start && now < w.end;

/**
 * Fenêtre de la semaine précédente à comparer. Pour la semaine en cours on ne compare qu'à la
 * même portion de la semaine d'avant : lundi–jeudi contre une semaine entière donnerait une baisse
 * artificielle.
 */
export function previousWindow(w: Week, now: Date): { from: number; to: number } {
  const from = addDays(w.start, -7).getTime();
  const full = w.start.getTime();
  if (!isCurrentWeek(w, now)) return { from, to: full };
  return { from, to: from + (now.getTime() - w.start.getTime()) };
}

export const groupOf = (r: Pick<ClickRow, 'entityType' | 'category'>): ClickGroup =>
  r.entityType === 'event' ? 'events' : isActivity(r.category) ? 'activities' : 'places';

const inRange = (r: ClickRow, from: number, to: number) => r.t >= from && r.t < to;

export function countClicks(rows: ClickRow[], from: number, to: number, group?: ClickGroup): number {
  let n = 0;
  for (const r of rows) if (inRange(r, from, to) && (!group || groupOf(r) === group)) n++;
  return n;
}

export const rowKey = (r: Pick<ClickRow, 'entityType' | 'entityId' | 'linkType'>) =>
  `${r.entityType}:${r.entityId}:${r.linkType}`;

/** Classement par fiche (et par type de lien : une sortie peut cumuler site web et réservation). */
export function rankClicks(rows: ClickRow[], from: number, to: number, group: ClickGroup): RankedRow[] {
  const acc = new Map<string, RankedRow>();
  for (const r of rows) {
    if (!inRange(r, from, to) || groupOf(r) !== group) continue;
    const key = rowKey(r);
    const hit = acc.get(key);
    if (hit) hit.count++;
    else acc.set(key, { key, entityType: r.entityType, entityId: r.entityId, linkType: r.linkType, name: r.name, category: r.category, count: 1 });
  }
  return [...acc.values()].sort((a, b) => b.count - a.count || (a.name ?? '').localeCompare(b.name ?? '', 'fr') || a.linkType.localeCompare(b.linkType));
}

/** Clics par semaine (ordre des `weeks`) pour chaque clé de ligne : sert aux mini-barres de tendance. */
export function trendByKey(rows: ClickRow[], weeks: Week[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const r of rows) {
    const i = weeks.findIndex((w) => r.t >= w.start.getTime() && r.t < w.end.getTime());
    if (i < 0) continue;
    const key = rowKey(r);
    const arr = out.get(key) ?? new Array(weeks.length).fill(0);
    arr[i]++;
    out.set(key, arr);
  }
  return out;
}

/** Entités (tous types de lien confondus) qui ont reçu au moins un clic dans la fenêtre. */
export function entityIdsClicked(rows: ClickRow[], from: number, to: number): Set<string> {
  const ids = new Set<string>();
  for (const r of rows) if (inRange(r, from, to)) ids.add(`${r.entityType}:${r.entityId}`);
  return ids;
}

/** Écart relatif en %, ou `null` quand il n'y avait rien à comparer. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** « 12 – 18 oct. » ou « 28 sept. – 4 oct. » (dimanche inclus, `end` étant exclusif). */
export function weekLabel(w: Week): string {
  const last = addDays(w.end, -1);
  if (w.start.getMonth() === last.getMonth()) {
    return `${w.start.getDate()} – ${shortDate.format(last)}`;
  }
  return `${shortDate.format(w.start)} – ${shortDate.format(last)}`;
}

export const dayMonth = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
