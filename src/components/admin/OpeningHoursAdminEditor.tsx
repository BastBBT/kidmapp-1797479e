import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WEEK_DISPLAY_ORDER, dayName } from '@/lib/openingHours';
import {
  initialAdminState,
  type HoursDraft,
  type HoursRange,
  type OpeningHoursAdminState,
} from '@/lib/openingHoursDraft';

/**
 * Édition des horaires d'un lieu dans l'admin.
 *
 * - Toute modification passe la fiche en saisie manuelle (`opening_hours_source = 'manuel'`) au
 *   moment de l'enregistrement : le sync mensuel Google ne l'écrasera plus.
 * - « Resynchroniser depuis Google » appelle tout de suite l'edge function en mode single, qui
 *   repasse la source en `google_auto` et réécrit les horaires.
 */

const inputStyle = {
  padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
  background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '14px', width: 84,
} as const;

const labelStyle = { fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 } as const;

interface Props {
  locationId: string;
  state: OpeningHoursAdminState;
  onChange: (next: OpeningHoursAdminState) => void;
  /** Appelé après un resync réussi, pour rafraîchir les listes. */
  onResynced?: () => void;
}

const OpeningHoursAdminEditor = ({ locationId, state, onChange, onResynced }: Props) => {
  const { toast } = useToast();
  const [resyncing, setResyncing] = useState(false);

  const editDraft = (draft: HoursDraft) => onChange({ ...state, draft, dirty: true });
  const editDay = (day: number, ranges: HoursRange[]) => {
    const days = state.draft.days.map((d, i) => (i === day ? ranges : d));
    editDraft({ ...state.draft, days });
  };

  const resync = async () => {
    if (!state.savedGooglePlaceId || state.googlePlaceId.trim() !== state.savedGooglePlaceId) {
      toast({ title: 'Enregistre d\'abord le Place ID', description: 'Le resync utilise le Place ID enregistré en base.', variant: 'destructive' });
      return;
    }
    if (state.dirty && !window.confirm('Les horaires saisis à la main seront remplacés par ceux de Google. Continuer ?')) return;
    setResyncing(true);
    const { data, error } = await supabase.functions.invoke('sync-opening-hours', {
      body: { mode: 'single', location_id: locationId },
    });
    if (error || data?.status === 'error') {
      setResyncing(false);
      toast({ title: 'Resync impossible', description: data?.error ?? error?.message ?? 'Erreur inconnue', variant: 'destructive' });
      return;
    }
    const { data: row } = await supabase
      .from('locations')
      .select('google_place_id, opening_hours, opening_hours_source, opening_hours_updated_at')
      .eq('id', locationId)
      .maybeSingle();
    setResyncing(false);
    if (row) onChange(initialAdminState(row));
    toast({ title: data?.status === 'no_hours' ? 'Google n\'a pas d\'horaires pour ce lieu' : 'Horaires resynchronisés depuis Google' });
    onResynced?.();
  };

  const sourceBadge = state.dirty
    ? { label: 'Manuel (non enregistré)', bg: '#FEF9E7', fg: '#8B6914' }
    : state.source === 'manuel'
      ? { label: 'Manuel', bg: '#FEF9E7', fg: '#8B6914' }
      : state.source === 'google_auto'
        ? { label: 'Google', bg: '#EBF4F2', fg: '#3B7D6E' }
        : { label: 'Aucune source', bg: 'var(--bg)', fg: 'var(--text-muted)' };

  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={labelStyle}>Horaires d'ouverture</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: sourceBadge.bg, color: sourceBadge.fg }}>
          {sourceBadge.label}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        {state.updatedAt
          ? `${state.source === 'manuel' ? 'Modifié' : 'Vérifié'} le ${new Date(state.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'Jamais synchronisé'}
        {state.source === 'manuel' && !state.dirty && ' · ignoré par le sync mensuel'}
        {state.dirty && ' · passera en saisie manuelle à l\'enregistrement'}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
        <input type="checkbox" checked={state.draft.alwaysOpen} onChange={(e) => editDraft({ ...state.draft, alwaysOpen: e.target.checked })} />
        Ouvert 24h/24
      </label>

      {!state.draft.alwaysOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {WEEK_DISPLAY_ORDER.map((day) => {
            const ranges = state.draft.days[day];
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ width: 70, textTransform: 'capitalize' }}>{dayName(day, 'fr-FR')}</span>
                {ranges.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Fermé</span>}
                {ranges.map((r, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input aria-label="Ouverture" placeholder="09:30" value={r.open} style={inputStyle}
                      onChange={(e) => editDay(day, ranges.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} />
                    –
                    <input aria-label="Fermeture" placeholder="18:00" value={r.close} style={inputStyle}
                      onChange={(e) => editDay(day, ranges.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} />
                    <button type="button" aria-label="Retirer le créneau" onClick={() => editDay(day, ranges.filter((_, j) => j !== i))}
                      style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </span>
                ))}
                {ranges.length < 3 && (
                  <button type="button" onClick={() => editDay(day, [...ranges, { open: '', close: '' }])}
                    style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}>
                    + créneau
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <span style={labelStyle}>Google Place ID</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
          <input
            value={state.googlePlaceId}
            onChange={(e) => onChange({ ...state, googlePlaceId: e.target.value })}
            placeholder="ChIJ…"
            style={{ ...inputStyle, flex: 1, width: 'auto' }}
          />
          {state.savedGooglePlaceId && (
            <a href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(state.savedGooglePlaceId)}`}
              target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)' }}>
              Voir sur Maps
            </a>
          )}
        </div>
        {state.googlePlaceId.trim() !== state.savedGooglePlaceId && !state.dirty && (
          <div style={{ fontSize: 11, color: '#8B6914', marginTop: 4 }}>
            Nouveau Place ID : les horaires actuels seront effacés à l'enregistrement. Resynchronise ensuite.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={resync}
        disabled={resyncing}
        style={{ marginTop: 10, width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer' }}
      >
        {resyncing ? 'Synchronisation…' : '↻ Resynchroniser depuis Google'}
      </button>
    </div>
  );
};

export default OpeningHoursAdminEditor;
