import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocationMeals, MealType, LocationMeal } from '@/hooks/useMeals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type MealWithType = LocationMeal & { meal_types: MealType };

interface Props {
  locationId: string;
  category?: string;
  onEdit?: () => void;
}

const MEAL_CATEGORIES = new Set(['restaurant', 'cafe']);

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const formatHours = (m: MealWithType) => {
  const start = m.time_open ?? m.meal_types.default_time_start;
  const end = m.time_close ?? m.meal_types.default_time_end;
  if (!start && !end) return null;
  return `${start ?? '?'} – ${end ?? '?'}`;
};

const MealRow = ({
  meal,
  onConfirm,
  isConfirming,
  showConfirmButton,
}: {
  meal: MealWithType;
  onConfirm?: () => void;
  isConfirming?: boolean;
  showConfirmButton?: boolean;
}) => {
  const hours = formatHours(meal);
  const isVerified = meal.confirmed_count >= 2;
  const fill = meal.meal_types.fill_hex || 'var(--primary)';
  const bg = meal.meal_types.bg_hex || 'var(--bg)';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14,
        background: bg,
      }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 12,
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}
      >
        {meal.meal_types.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {meal.meal_types.label}
          </div>
          {isVerified && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 100, background: '#EBF6EC', color: '#2E7D32',
              letterSpacing: '0.02em',
            }}>
              ✓ Confirmé
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {hours ?? 'Horaires à confirmer'}
        </div>
      </div>
      {showConfirmButton && (
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          style={{
            padding: '6px 12px', borderRadius: 100,
            background: fill, color: '#fff',
            fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer', flexShrink: 0,
            opacity: isConfirming ? 0.6 : 1,
          }}
        >
          {isConfirming ? '…' : 'Confirmer'}
        </button>
      )}
    </div>
  );
};

const LocationServicesSection = ({ locationId, category, onEdit }: Props) => {
  if (!category || !MEAL_CATEGORIES.has(category)) return null;
  return <LocationServicesSectionInner locationId={locationId} onEdit={onEdit} />;
};

const LocationServicesSectionInner = ({ locationId, onEdit }: { locationId: string; onEdit?: () => void }) => {
  const { data = [], isLoading } = useLocationMeals(locationId);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unconfirmedOpen, setUnconfirmedOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const meals = data as MealWithType[];

  const { confirmed, unconfirmed } = useMemo(() => {
    const sorted = [...meals].sort(
      (a, b) => (a.meal_types.sort_order ?? 0) - (b.meal_types.sort_order ?? 0)
    );
    return {
      confirmed: sorted.filter((m) => m.is_confirmed || m.confirmed_count >= 1),
      unconfirmed: sorted.filter((m) => !m.is_confirmed && m.confirmed_count < 1),
    };
  }, [meals]);

  const handleConfirm = async (meal: MealWithType) => {
    if (!user) {
      toast({ title: 'Connexion requise', description: 'Connecte-toi pour confirmer.' });
      return;
    }
    setPendingId(meal.id);
    try {
      const { error: rpcError } = await supabase.rpc('increment_meal_confirmed_count', {
        p_location_id: locationId,
        p_meal_type_id: meal.meal_type_id,
      });
      if (rpcError) throw rpcError;

      // After increment, mark as confirmed (count is now >= 1)
      const { error: updateError } = await supabase
        .from('location_meals')
        .update({ is_confirmed: true })
        .eq('id', meal.id);
      if (updateError) throw updateError;

      toast({ title: 'Merci !', description: 'Repas confirmé ✦' });
      queryClient.invalidateQueries({ queryKey: ['location_meals', locationId] });
      queryClient.invalidateQueries({ queryKey: ['location_meals', 'all'] });
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message ?? 'Réessaie plus tard.',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  const SectionHeader = (
    <div style={{ marginBottom: 12 }}>
      <h2 className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
        Horaires & services
      </h2>
    </div>
  );

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      {SectionHeader}

      {isLoading ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : meals.length === 0 ? (
        <div style={{
          padding: '18px 16px', borderRadius: 14,
          background: 'var(--bg)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Horaires non renseignés — sois le premier à contribuer !
          </div>
        </div>
      ) : (
        <>
          {confirmed.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {confirmed.map((m) => (
                <MealRow key={m.id} meal={m} />
              ))}
            </div>
          )}

          {unconfirmed.length > 0 && (
            <div style={{ marginTop: confirmed.length > 0 ? 12 : 0 }}>
              <button
                onClick={() => setUnconfirmedOpen((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: 'var(--bg)', border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                <span>Services non confirmés ({unconfirmed.length})</span>
                <ChevronDown open={unconfirmedOpen} />
              </button>
              <AnimatePresence initial={false}>
                {unconfirmedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {unconfirmed.map((m) => (
                        <MealRow
                          key={m.id}
                          meal={m}
                          showConfirmButton
                          isConfirming={pendingId === m.id}
                          onConfirm={() => handleConfirm(m)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LocationServicesSection;
