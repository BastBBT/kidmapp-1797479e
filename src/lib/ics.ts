import { EventItem } from '@/types/event';

const pad = (n: number) => String(n).padStart(2, '0');

const formatICSDate = (dateStr: string, time?: string | null): string => {
  // dateStr = YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  if (time) {
    const [hh, mm] = time.split(':').map((s) => parseInt(s, 10));
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
    }
  }
  return `${y}${pad(m)}${pad(d)}`;
};

const escape = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export const buildIcs = (event: EventItem): string => {
  const dtStart = formatICSDate(event.date_start, event.time);
  const dtEndRaw = event.date_end ?? event.date_start;
  // If time provided, use 2h default; else all-day end = date_end + 1
  let dtEnd = '';
  if (event.time) {
    dtEnd = formatICSDate(dtEndRaw, event.time);
    // add ~2h
    const t = event.time.split(':').map((s) => parseInt(s, 10));
    const endHH = (t[0] + 2) % 24;
    dtEnd = dtEnd.replace(/T\d{6}$/, `T${pad(endHH)}${pad(t[1] || 0)}00`);
  } else {
    const [y, m, d] = dtEndRaw.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    dtEnd = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
  }

  const uid = `${event.id}@kidmapp.app`;
  const now = new Date();
  const dtStamp =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kidmapp//FR',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    event.time ? `DTSTART:${dtStart}` : `DTSTART;VALUE=DATE:${dtStart}`,
    event.time ? `DTEND:${dtEnd}` : `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escape(event.name)}`,
    event.address ? `LOCATION:${escape(event.address)}` : '',
    event.note ? `DESCRIPTION:${escape(event.note)}` : '',
    event.website ? `URL:${escape(event.website)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
};

export const downloadIcs = (event: EventItem) => {
  const content = buildIcs(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.name.replace(/[^\w-]+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};
