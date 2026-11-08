import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { dateFromISO } from '@/lib/eventCalendar';
import { isSpotlightFrequency, type SpotlightFrequency } from '@/lib/eventSpotlight';
import { isPastEvent, todayISO } from '@/lib/weekend';
import { hasRecurrence } from '@/types/event';
import {
  HEADLINE_MAX, MESSAGE_MAX, emptySpotlightForm, endForShortcut, overlapsOf, parseSpotlightStats,
  percentOf, spotlightStatus, validateSpotlight, type EndShortcut, type SpotlightForm,
  type SpotlightStats, type SpotlightStatus,
} from './spotlightAdmin';

interface SpotlightRow {
  id: string;
  event_id: string;
  headline: string;
  message: string | null;
  starts_on: string;
  ends_on: string;
  frequency: string;
  show_calendar_cta: boolean;
  show_photo: boolean;
  last_reminder: boolean;
  created_at: string;
  events: { name: string; category: string; date_start: string; date_end: string | null } | null;
}

interface EventOption {
  id: string;
  name: string;
  date_start: string;
  date_end: string | null;
}

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)',
};
const muted: React.CSSProperties = { fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' };
const labelStyle: React.CSSProperties = { fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--text)' };
const input: React.CSSProperties = {
  width: '100%', minHeight: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 15,
};
const WARN = '#9A5B00';

const FREQUENCY_LABEL: Record<SpotlightFrequency, string> = {
  weekend: 'Une fois par week-end',
  daily: 'Une fois par jour',
  once: 'Une seule fois',
};
const FREQUENCY_HELP: Record<SpotlightFrequency, string> = {
  weekend: 'À la première ouverture de chaque week-end de la période, dès le jeudi à 12 h. Rien du lundi au jeudi midi.',
  daily: 'Pour une sortie très proche ou une période courte.',
  once: 'Un seul affichage sur toute la période.',
};
const STATUS_LABEL: Record<SpotlightStatus, string> = { active: 'En cours', planned: 'Planifiées', ended: 'Terminées' };
const STATUS_PILL: Record<SpotlightStatus, { background: string; color: string }> = {
  active: { background: '#E3F1EC', color: '#25594D' },
  planned: { background: '#FEF3CF', color: '#7A5A00' },
  ended: { background: '#EEEAE3', color: '#5F5953' },
};

const day = (iso: string) =>
  dateFromISO(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

const fromRow = (r: SpotlightRow): SpotlightForm => ({
  event_id: r.event_id,
  headline: r.headline,
  message: r.message ?? '',
  starts_on: r.starts_on,
  ends_on: r.ends_on,
  frequency: isSpotlightFrequency(r.frequency) ? r.frequency : 'weekend',
  show_calendar_cta: r.show_calendar_cta,
  show_photo: r.show_photo,
  last_reminder: r.last_reminder,
});

/**
 * Onglet « À la une » : choisir la sortie à mettre en avant sur l'accueil, pour combien de temps, avec
 * quel texte et à quelle fréquence. Une seule mise en avant s'affiche à la fois (la plus récente) :
 * le formulaire avertit quand deux périodes se chevauchent. Seul l'admin peut écrire (règles d'accès).
 */
export function SpotlightsTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const today = todayISO();
  const { data: allEvents = [] } = useEvents();

  const rowsQuery = useQuery({
    queryKey: ['admin', 'event-spotlights'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_spotlights')
        .select('*, events(name, category, date_start, date_end)')
        .order('starts_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SpotlightRow[];
    },
  });
  const statsQuery = useQuery({
    queryKey: ['admin', 'event-spotlight-stats'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_event_spotlight_stats');
      if (error) throw error;
      return parseSpotlightStats(data);
    },
  });
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);
  const stats: Record<string, SpotlightStats> = statsQuery.data ?? {};

  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [form, setForm] = useState<SpotlightForm>(() => emptySpotlightForm(today));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Sorties proposées : à venir, ou rejouant (leurs dates portées par la sortie peuvent être périmées).
  const options = useMemo<EventOption[]>(() => {
    const list = allEvents
      .filter((e) => !isPastEvent(e.date_start, e.date_end) || hasRecurrence(e))
      .map((e) => ({ id: e.id, name: e.name, date_start: e.date_start, date_end: e.date_end }));
    const current = form.event_id;
    if (current && !list.some((o) => o.id === current)) {
      const known = rows.find((r) => r.event_id === current);
      if (known?.events) list.push({ id: current, name: known.events.name, date_start: known.events.date_start, date_end: known.events.date_end });
    }
    return list.sort((a, b) => (a.date_start < b.date_start ? -1 : a.date_start > b.date_start ? 1 : a.name.localeCompare(b.name, 'fr')));
  }, [allEvents, rows, form.event_id]);
  const selectedEvent = options.find((o) => o.id === form.event_id) ?? null;

  const overlapping = useMemo(
    () => overlapsOf({ id: editing && editing !== 'new' ? editing : undefined, starts_on: form.starts_on, ends_on: form.ends_on }, rows),
    [editing, form.starts_on, form.ends_on, rows],
  );
  const issues = validateSpotlight(form, selectedEvent, overlapping);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'event-spotlights'] });
    qc.invalidateQueries({ queryKey: ['admin', 'event-spotlight-stats'] });
    qc.invalidateQueries({ queryKey: ['event-spotlight', 'active'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        event_id: form.event_id,
        headline: form.headline.trim(),
        message: form.message.trim() === '' ? null : form.message.trim(),
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        frequency: form.frequency,
        show_calendar_cta: form.show_calendar_cta,
        show_photo: form.show_photo,
        last_reminder: form.last_reminder,
      };
      const { error } = editing && editing !== 'new'
        ? await supabase.from('event_spotlights').update(payload).eq('id', editing)
        : await supabase.from('event_spotlights').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { setEditing(null); setSaveError(null); invalidate(); },
    onError: () => setSaveError("L'enregistrement a échoué. Réessaie dans un instant."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_spotlights').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { setConfirmDelete(null); invalidate(); },
    onError: () => setSaveError('La suppression a échoué. Réessaie dans un instant.'),
  });

  const startNew = () => { setForm(emptySpotlightForm(today)); setSaveError(null); setEditing('new'); };
  const startEdit = (r: SpotlightRow) => { setForm(fromRow(r)); setSaveError(null); setEditing(r.id); };
  const patch = (p: Partial<SpotlightForm>) => setForm((f) => ({ ...f, ...p }));

  const pickEvent = (id: string) => {
    const ev = options.find((o) => o.id === id);
    setForm((f) => {
      const next: SpotlightForm = { ...f, event_id: id };
      if (ev && f.headline.trim() === '') next.headline = ev.name.slice(0, HEADLINE_MAX);
      // Nouvelle mise en avant : par défaut jusqu'au jour J, sans toucher à ce qu'on a déjà réglé.
      if (ev && editing === 'new' && f.ends_on === f.starts_on) {
        const end = endForShortcut('dayJ', f.starts_on, ev);
        if (end && end >= f.starts_on) next.ends_on = end;
      }
      return next;
    });
  };
  const shortcut = (kind: EndShortcut) => {
    const end = endForShortcut(kind, form.starts_on, selectedEvent);
    if (end) patch({ ends_on: end });
  };

  const groups = (['active', 'planned', 'ended'] as const).map((status) => ({
    status,
    items: rows.filter((r) => spotlightStatus(r, today) === status),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={muted}>
          Une sortie mise en avant sur l'accueil, en feuille du bas. Une seule s'affiche à la fois, la plus récente.
        </div>
        {editing === null && (
          <button type="button" onClick={startNew} style={primaryBtn}>Nouvelle mise en avant</button>
        )}
      </div>

      {editing !== null && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (issues.errors.length === 0) save.mutate(); }}
          style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}
          aria-label="Mise en avant"
        >
          <div style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500 }}>
            {editing === 'new' ? 'Nouvelle mise en avant' : 'Modifier la mise en avant'}
          </div>

          <Field label="Sortie à mettre en avant" htmlFor="sp-event" help="Sorties publiées et à venir.">
            <select id="sp-event" value={form.event_id} onChange={(e) => pickEvent(e.target.value)} style={input}>
              <option value="">Choisir une sortie…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.date_end && o.date_end !== o.date_start ? `du ${day(o.date_start)} au ${day(o.date_end)}` : day(o.date_start)}
                </option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Période de mise en avant</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <Field label="Du" htmlFor="sp-start" small>
                <input id="sp-start" type="date" value={form.starts_on} onChange={(e) => patch({ starts_on: e.target.value })} style={input} />
              </Field>
              <Field label="Au (inclus)" htmlFor="sp-end" small>
                <input id="sp-end" type="date" value={form.ends_on} onChange={(e) => patch({ ends_on: e.target.value })} style={input} />
              </Field>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <ShortcutChip onClick={() => shortcut('dayJ')} disabled={!selectedEvent}>Jusqu'au jour J</ShortcutChip>
              <ShortcutChip onClick={() => shortcut('eventEnd')} disabled={!selectedEvent}>Jusqu'à la fin de la sortie</ShortcutChip>
              <ShortcutChip onClick={() => shortcut('week')} disabled={!form.starts_on}>7 jours</ShortcutChip>
            </div>
          </div>

          <Field label="Accroche" htmlFor="sp-headline" counter={`${form.headline.length} / ${HEADLINE_MAX}`}>
            <input id="sp-headline" type="text" maxLength={HEADLINE_MAX} autoComplete="off" value={form.headline} onChange={(e) => patch({ headline: e.target.value })} style={input} />
          </Field>
          <Field label="Texte (facultatif)" htmlFor="sp-message" counter={`${form.message.length} / ${MESSAGE_MAX}`}>
            <textarea id="sp-message" maxLength={MESSAGE_MAX} value={form.message} onChange={(e) => patch({ message: e.target.value })} style={{ ...input, minHeight: 84, padding: '10px 12px', resize: 'vertical' }} />
          </Field>
          <div style={muted}>L'accroche et le texte sont affichés tels quels, en français, dans toutes les langues de l'app.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Check id="sp-cal" checked={form.show_calendar_cta} onChange={(v) => patch({ show_calendar_cta: v })}>Proposer « Ajouter au calendrier »</Check>
            <Check id="sp-photo" checked={form.show_photo} onChange={(v) => patch({ show_photo: v })}>Afficher la photo de la sortie</Check>
            <Check id="sp-last" checked={form.last_reminder} onChange={(v) => patch({ last_reminder: v })}>Dernier rappel entre J-3 et le jour J</Check>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <legend style={{ ...labelStyle, padding: 0, marginBottom: 6 }}>Fréquence d'affichage</legend>
            {(['weekend', 'daily', 'once'] as const).map((f) => (
              <label
                key={f}
                style={{
                  display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '2px 10px', padding: 12, borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${form.frequency === f ? 'var(--primary)' : 'var(--border)'}`,
                  background: form.frequency === f ? 'var(--primary-light)' : 'var(--surface)',
                }}
              >
                <input type="radio" name="sp-frequency" value={f} checked={form.frequency === f} onChange={() => patch({ frequency: f })} style={{ marginTop: 3, accentColor: 'var(--primary)' }} />
                <span style={{ fontFamily: 'DM Sans', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>
                  {FREQUENCY_LABEL[f]}
                  {f === 'weekend' && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '2px 8px', borderRadius: 999 }}>Par défaut</span>}
                </span>
                <span style={{ gridColumn: 2, ...muted, fontSize: 13 }}>{FREQUENCY_HELP[f]}</span>
              </label>
            ))}
          </fieldset>

          <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'DM Sans', fontSize: 13 }}>
            {issues.errors.map((m) => <span key={m} style={{ color: 'var(--primary)' }}>{m}</span>)}
            {issues.warnings.map((m) => <span key={m} style={{ color: WARN }}>{m}</span>)}
            {saveError && <span style={{ color: 'var(--primary)' }}>{saveError}</span>}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={issues.errors.length > 0 || save.isPending} style={{ ...primaryBtn, opacity: issues.errors.length > 0 || save.isPending ? 0.5 : 1 }}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setEditing(null)} style={ghostBtn}>Annuler</button>
          </div>
        </form>
      )}

      {rowsQuery.isLoading && <div style={muted}>Chargement…</div>}
      {rowsQuery.error && <div style={{ ...muted, color: 'var(--primary)' }}>Impossible de charger les mises en avant.</div>}
      {statsQuery.error && <div style={{ ...muted, color: 'var(--primary)' }}>Impossible de charger les statistiques : les chiffres affichés sont à zéro.</div>}
      {!rowsQuery.isLoading && !rowsQuery.error && rows.length === 0 && editing === null && (
        <div style={card}><span style={muted}>Aucune mise en avant pour l'instant.</span></div>
      )}

      {groups.filter((g) => g.items.length > 0).map((g) => (
        <section key={g.status} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500 }}>{STATUS_LABEL[g.status]}</h3>
          {g.items.map((r) => (
            <SpotlightCard
              key={r.id}
              row={r}
              status={g.status}
              stats={stats[r.id]}
              confirming={confirmDelete === r.id}
              busy={remove.isPending}
              onEdit={() => startEdit(r)}
              onAskDelete={() => setConfirmDelete(r.id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={() => remove.mutate(r.id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function SpotlightCard({ row, status, stats, confirming, busy, onEdit, onAskDelete, onCancelDelete, onDelete }: {
  row: SpotlightRow; status: SpotlightStatus; stats: SpotlightStats | undefined; confirming: boolean; busy: boolean;
  onEdit: () => void; onAskDelete: () => void; onCancelDelete: () => void; onDelete: () => void;
}) {
  const s: SpotlightStats = stats ?? { id: row.id, shown: 0, shownLast: 0, opens: 0, calendarAdds: 0, dismisses: 0, uniqueViewers: 0 };
  const displays = s.shown + s.shownLast;
  const freq = isSpotlightFrequency(row.frequency) ? FREQUENCY_LABEL[row.frequency] : row.frequency;
  const tapRate = percentOf(s.opens, displays);
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>{row.headline}</div>
          <div style={muted}>{row.events?.name ?? 'Sortie supprimée'}</div>
        </div>
        <span style={{ ...STATUS_PILL[status], fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          {status === 'active' ? 'En cours' : status === 'planned' ? 'Planifiée' : 'Terminée'}
        </span>
      </div>
      <div style={{ ...muted, fontSize: 13 }}>
        Du {day(row.starts_on)} au {day(row.ends_on)} · {freq}
        {row.last_reminder ? ' · dernier rappel' : ''}{row.show_calendar_cta ? ' · calendrier' : ''}{row.show_photo ? ' · photo' : ''}
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <Stat label="Affichages" value={displays} note={s.shownLast > 0 ? `dont ${s.shownLast} rappel${s.shownLast > 1 ? 's' : ''}` : undefined} />
        <Stat label="Spectateurs uniques" value={s.uniqueViewers} />
        <Stat label="Taps « Voir »" value={s.opens} note={tapRate !== null ? `${tapRate} % des affichages` : undefined} />
        <Stat label="Ajouts agenda" value={s.calendarAdds} />
        <Stat label="Croix" value={s.dismisses} />
      </dl>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!confirming ? (
          <>
            <button type="button" onClick={onEdit} style={ghostBtn}>Modifier</button>
            <button type="button" onClick={onAskDelete} style={ghostBtn}>Supprimer</button>
          </>
        ) : (
          <>
            <span style={{ ...muted, fontSize: 13 }}>Supprimer aussi ses statistiques ?</span>
            <button type="button" onClick={onDelete} disabled={busy} style={{ ...ghostBtn, color: 'var(--primary)', borderColor: 'var(--primary)' }}>Oui, supprimer</button>
            <button type="button" onClick={onCancelDelete} style={ghostBtn}>Non</button>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 10px' }}>
      <dt style={muted}>{label}</dt>
      <dd style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 20, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString('fr-FR')}</dd>
      {note && <div style={{ ...muted, fontSize: 11 }}>{note}</div>}
    </div>
  );
}

function Field({ label, htmlFor, help, counter, small, children }: {
  label: string; htmlFor: string; help?: string; counter?: string; small?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label htmlFor={htmlFor} style={small ? muted : labelStyle}>{label}</label>
      {children}
      {help && <span style={muted}>{help}</span>}
      {counter && <span style={{ ...muted, alignSelf: 'flex-end', fontVariantNumeric: 'tabular-nums' }}>{counter}</span>}
    </div>
  );
}

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14.5, color: 'var(--text)' }}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--secondary)' }} />
      {children}
    </label>
  );
}

function ShortcutChip({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 500, padding: '6px 12px', minHeight: 32, borderRadius: 999,
        border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

const primaryBtn: React.CSSProperties = {
  minHeight: 44, padding: '0 20px', border: 'none', borderRadius: 999, background: 'var(--primary)', color: '#fff',
  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  minHeight: 40, padding: '0 16px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
