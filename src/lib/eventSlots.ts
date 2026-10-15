/**
 * Créneaux d'un événement proposé (table `event_occurrences`).
 *
 * Le formulaire de proposition saisit une liste de créneaux. Le plus tôt part dans la ligne
 * `events` elle-même (un trigger Postgres en fait l'occurrence par défaut) ; les suivants sont
 * insérés dans `event_occurrences` juste après. Miroir de `ProposeEventSheet` (iOS) et
 * `propose_event_sheet.dart` (Android).
 */
export type SlotDraft = { date_start: string; date_end: string; time: string };

export type SlotRow = { date_start: string; date_end: string | null; time: string | null };

export const MAX_EVENT_SLOTS = 20;

export const emptySlotDraft = (): SlotDraft => ({ date_start: '', date_end: '', time: '' });

/** Bornes d'année acceptées : Chrome laisse taper 6 chiffres dans un champ date (« 20261-10-26 »),
 *  et Postgres accepterait jusqu'à l'an 5 874 897. */
export const MIN_SLOT_DATE = '2000-01-01';
export const MAX_SLOT_DATE = '2100-12-31';

/** `AAAA-MM-JJ` réel (le 31 février est refusé) et dans les bornes ci-dessus. */
export const isValidYmd = (ymd: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || ymd < MIN_SLOT_DATE || ymd > MAX_SLOT_DATE) return false;
  const d = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd;
};

const addOneDay = (ymd: string): string => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** Le nouveau créneau reprend l'heure du précédent et tombe le lendemain : presque toujours le
 *  même atelier à la même heure. */
export const nextSlotDraft = (prev: SlotDraft): SlotDraft => {
  const base = prev.date_end || prev.date_start;
  // Une date saisie à moitié ou hors bornes ne doit jamais faire planter le rendu.
  const next = isValidYmd(base) ? addOneDay(base) : '';
  // Le lendemain du dernier jour accepté sort des bornes : on laisse la date à saisir.
  if (next && !isValidYmd(next)) return { date_start: '', date_end: '', time: prev.time };
  return { date_start: next, date_end: '', time: prev.time };
};

/** Date remplie mais illisible ou hors bornes : l'envoi reste bloqué avec un message. */
export const slotDateError = (s: SlotDraft): boolean =>
  Boolean((s.date_start && !isValidYmd(s.date_start)) || (s.date_end && !isValidYmd(s.date_end)));

/** Une fin avant le début ne veut rien dire : l'envoi reste bloqué tant qu'elle n'est pas corrigée. */
export const slotRangeError = (s: SlotDraft): boolean =>
  Boolean(s.date_start && s.date_end && s.date_end < s.date_start);

/** Un créneau sans date de début est une ligne vide laissée par erreur : on l'ignore. */
export const filledSlots = (drafts: SlotDraft[]): SlotDraft[] => drafts.filter((s) => s.date_start);

/** Prêt à envoyer : au moins un créneau, aucune date illisible, aucune plage inversée. */
export const slotsAreValid = (drafts: SlotDraft[]): boolean =>
  filledSlots(drafts).length > 0 && !drafts.some((s) => slotDateError(s) || slotRangeError(s));

// `localeCompare` classerait « ~ » avant les chiffres : comparaison brute, « ~ » > « 9 » en ASCII.
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Créneaux à envoyer : lignes vides écartées, doublons retirés, triés par date puis heure (sans
 * heure en dernier) pour que le premier — celui qui part dans `events` — soit le plus proche.
 * Plafonné à `MAX_EVENT_SLOTS` : le bouton disparaît à 20 dans l'UI, mais le plafond doit tenir
 * même si la liste est alimentée autrement.
 */
export const preparedSlots = (drafts: SlotDraft[]): SlotRow[] => {
  const seen = new Set<string>();
  return filledSlots(drafts)
    .map((s) => ({ date_start: s.date_start, date_end: s.date_end || null, time: s.time || null }))
    .filter((r) => {
      const key = `${r.date_start}|${r.date_end ?? ''}|${r.time ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => cmp(a.date_start, b.date_start) || cmp(a.time ?? '~', b.time ?? '~'))
    .slice(0, MAX_EVENT_SLOTS);
};
