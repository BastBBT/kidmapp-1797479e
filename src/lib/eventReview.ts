// Pré-tri automatique des events du bot de collecte (colonnes review_* de `events`).
// Le bot pose des drapeaux à l'insertion ; l'admin montre la raison de chaque drapeau et publie en
// lot les events sans drapeau. Les codes doivent rester alignés sur la contrainte
// events_review_flags_allowed et sur l'ÉTAPE 4quater du playbook automation.

export type ReviewState = 'flagged' | 'clear' | 'unchecked';

export const REVIEW_FLAG_LABELS: Record<string, string> = {
  lien_source: 'Lien source',
  date_non_trouvee: 'Date non trouvée sur la source',
  tarif_ambigu: 'Tarif ambigu',
  public_enfant_non_prouve: 'Public enfant non prouvé',
  doublon_possible: 'Doublon possible',
  hors_zone: 'Hors zone / géocodage douteux',
  source_a_risque: 'Source à risque',
};

type Reviewable = {
  review_flags?: string[] | null;
  review_detail?: string | null;
  review_checked_at?: string | null;
};

// Non évalué = le bot n'est pas passé (proposition utilisateur, ancien event) : on ne peut rien
// en dire, ce n'est surtout pas un « rien à vérifier ».
export function reviewStateOf(ev: Reviewable): ReviewState {
  if ((ev.review_flags ?? []).length > 0) return 'flagged';
  return ev.review_checked_at ? 'clear' : 'unchecked';
}

export type ReviewReason = { code: string | null; label: string; detail: string | null };

// review_detail = une ligne par drapeau, « code : explication ». Une ligne sans code connu est
// gardée telle quelle : mieux vaut un texte brut qu'une raison perdue.
export function reviewReasons(ev: Reviewable): ReviewReason[] {
  const flags = Array.from(new Set(ev.review_flags ?? []));
  const details = new Map<string, string>();
  const loose: string[] = [];
  for (const raw of (ev.review_detail ?? '').split('\n')) {
    const line = raw.trim().replace(/^[-•]\s*/, '');
    if (!line) continue;
    const m = line.match(/^([a-z_]+)\s*:\s*(.+)$/);
    if (m && flags.includes(m[1])) {
      details.set(m[1], details.has(m[1]) ? `${details.get(m[1])} · ${m[2]}` : m[2]);
    } else {
      loose.push(line);
    }
  }
  const reasons: ReviewReason[] = flags.map((code) => ({
    code,
    label: REVIEW_FLAG_LABELS[code] ?? code,
    detail: details.get(code) ?? null,
  }));
  for (const line of loose) reasons.push({ code: null, label: 'Note du bot', detail: line });
  return reasons;
}
