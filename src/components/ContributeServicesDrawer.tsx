import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMealTypes, useLocationMeals, MealType } from '@/hooks/useMeals';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  locationId: string;
  open: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
}

interface MealFormState {
  enabled: boolean;
  time_open: string;
  time_close: string;
}

const ContributeServicesDrawer = ({ locationId, open, onClose, onRequireAuth }: Props) => {
  const { user } = useAuth();
  const { data: mealTypes = [] } = useMealTypes();
  const { data: existing = [] } = useLocationMeals(locationId);
  const queryClient = useQueryClient();
  const [state, setState] = useState<Record<string, MealFormState>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, MealFormState> = {};
    mealTypes.forEach((mt) => {
      const found = existing.find((e) => e.meal_type_id === mt.id);
      initial[mt.id] = {
        enabled: !!found,
        time_open: found?.time_open ?? mt.default_time_start ?? '12:00',
        time_close: found?.time_close ?? mt.default_time_end ?? '14:00',
      };
    });
    setState(initial);
  }, [open, mealTypes, existing]);

  const toggleMeal = (id: string) =>
    setState((s) => ({ ...s, [id]: { ...s[id], enabled: !s[id]?.enabled } }));

  const updateField = (id: string, patch: Partial<MealFormState>) =>
    setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  const handleSubmit = async () => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    setSubmitting(true);
    try {
      const rows = Object.entries(state)
        .filter(([, v]) => v.enabled)
        .map(([meal_type_id, v]) => ({
          location_id: locationId,
          meal_type_id,
          time_open: v.time_open || null,
          time_close: v.time_close || null,
          is_confirmed: true,
          created_by: user.id,
        }));

      if (rows.length === 0) {
        toast('Active au moins un repas avant de valider.');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('location_meals')
        .upsert(rows, { onConflict: 'location_id,meal_type_id' });
      if (error) throw error;

      toast.success('Merci ! Ta contribution a bien été envoyée ✨');
      queryClient.invalidateQueries({ queryKey: ['location_meals', locationId] });
      queryClient.invalidateQueries({ queryKey: ['location_meals', 'all'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const sortedMealTypes = useMemo(
    () => [...mealTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [mealTypes]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000]"
            style={{ background: 'rgba(28,25,23,0.35)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col"
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius) var(--radius) 0 0',
              maxHeight: '90vh',
            }}
          >
            <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>
                  Contribuer — Services & Horaires
                </h2>
                <button onClick={onClose} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Active les repas servis et précise les horaires.
              </p>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px 16px' }}>
              {!user && (
                <div
                  style={{
                    padding: 14, borderRadius: 14, background: 'var(--bg)',
                    marginBottom: 14, fontSize: 13, color: 'var(--text-muted)',
                  }}
                >
                  Connecte-toi pour pouvoir contribuer.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedMealTypes.map((mt) => {
                  const s = state[mt.id];
                  if (!s) return null;
                  const fill = mt.fill_hex || 'var(--primary)';
                  const bg = mt.bg_hex || 'var(--bg)';
                  return (
                    <MealRowEditor
                      key={mt.id}
                      mealType={mt}
                      state={s}
                      fill={fill}
                      bg={bg}
                      onToggle={() => toggleMeal(mt.id)}
                      onTimeOpen={(v) => updateField(mt.id, { time_open: v })}
                      onTimeClose={(v) => updateField(mt.id, { time_close: v })}
                    />
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: '14px 20px 32px', flexShrink: 0,
                borderTop: '1px solid var(--border)', background: 'var(--surface)',
              }}
            >
              <p
                style={{
                  fontFamily: 'Caveat, cursive',
                  fontSize: 15, color: 'var(--text-muted)',
                  textAlign: 'center', marginBottom: 10,
                }}
              >
                Vos infos aident des dizaines de familles à Nantes chaque semaine ✨
              </p>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ borderRadius: 100, background: 'var(--primary)', color: '#fff' }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {user ? 'Envoyer ma contribution' : 'Se connecter pour contribuer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MealRowEditor = ({
  mealType, state, fill, bg, onToggle, onTimeOpen, onTimeClose,
}: {
  mealType: MealType;
  state: MealFormState;
  fill: string;
  bg: string;
  onToggle: () => void;
  onTimeOpen: (v: string) => void;
  onTimeClose: (v: string) => void;
}) => {
  const subtitle =
    mealType.default_time_start && mealType.default_time_end
      ? `Généralement ${mealType.default_time_start} – ${mealType.default_time_end}`
      : '';

  return (
    <div
      style={{
        borderRadius: 14,
        background: state.enabled ? bg : 'var(--surface)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20, flexShrink: 0,
          }}
        >
          {mealType.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {mealType.label}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            width: 42, height: 24, borderRadius: 100,
            background: state.enabled ? fill : 'var(--border)',
            position: 'relative', transition: 'background .2s', flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute', top: 2, left: state.enabled ? 20 : 2,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {state.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', display: 'flex', gap: 10 }}>
              <TimeField label="Ouverture" value={state.time_open} onChange={onTimeOpen} />
              <TimeField label="Fermeture" value={state.time_close} onChange={onTimeClose} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TimeField = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '10px 12px', borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--surface)',
        fontSize: 16, fontFamily: 'DM Sans', color: 'var(--text)',
      }}
    />
  </label>
);

export default ContributeServicesDrawer;
