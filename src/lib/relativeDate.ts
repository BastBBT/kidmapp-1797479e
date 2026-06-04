export function formatRelativeDateFr(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const dayMs = 86400000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startToday - startDate) / dayMs);

  if (dayDiff <= 0) return "Aujourd'hui";
  if (dayDiff === 1) return 'Hier';
  if (dayDiff < 7) return `Il y a ${dayDiff} jours`;
  if (dayDiff < 30) {
    const w = Math.floor(dayDiff / 7);
    return `Il y a ${w} semaine${w > 1 ? 's' : ''}`;
  }
  if (dayDiff < 365) {
    const m = Math.floor(dayDiff / 30);
    return `Il y a ${m} mois`;
  }
  const y = Math.floor(dayDiff / 365);
  return `Il y a ${y} an${y > 1 ? 's' : ''}`;
}
