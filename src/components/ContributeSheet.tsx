import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMealTypes } from '@/hooks/useMeals';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  locationId: string;
  category: string;
  open: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
}

const MEAL_CATEGORIES = new Set(['restaurant', 'cafe']);
const MAX_COMMENT_MEAL = 200;
const MAX_COMMENT_GENERIC = 300;

const ContributeSheet = ({ locationId, category, open, onClose, onRequireAuth }: Props) => {
  const { user } = useAuth();
  const { data: mealTypes = [] } = useMealTypes();
  const queryClient = useQueryClient();
  const variant = MEAL_CATEGORIES.has(category) ? 'meals' : 'comment';
  const maxLen = variant === 'meals' ? MAX_COMMENT_MEAL : MAX_COMMENT_GENERIC;

  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setComment('');
    }
  }, [open]);

  const sortedMealTypes = useMemo(
    () => [...mealTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [mealTypes]
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const canSubmit =
    variant === 'meals' ? selected.length > 0 : comment.trim().length > 0;

  const handleSubmit = async () => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const isMeals = variant === 'meals';
      const payload = isMeals
        ? { meal_types: selected, comment: comment.trim() || null }
        : { comment: comment.trim() };
      const { error } = await supabase.from('contributions').insert({
        location_id: locationId,
        user_id: user.id,
        type: isMeals ? 'meal_types' : 'comment',
        content: JSON.stringify(payload),
        status: 'pending',
      });
      if (error) throw error;

      toast.success('Merci pour ta contribution !');
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle =
    variant === 'meals'
      ? 'Quels repas avez-vous fait ici ?'
      : 'Partagez votre expérience';

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
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                  Contribuer
                </h2>
                <button onClick={onClose} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>
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

              {variant === 'meals' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sortedMealTypes.map((mt) => {
                      const active = selected.includes(mt.id);
                      const fill = mt.fill_hex || 'var(--primary)';
                      const bg = mt.bg_hex || 'var(--bg)';
                      return (
                        <button
                          key={mt.id}
                          onClick={() => toggle(mt.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 14,
                            background: active ? bg : 'var(--surface)',
                            border: active ? `2px solid ${fill}` : '1px solid var(--border)',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'background .15s, border-color .15s',
                          }}
                        >
                          <div
                            style={{
                              width: 38, height: 38, borderRadius: 12,
                              background: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 20, flexShrink: 0,
                            }}
                          >
                            {mt.emoji}
                          </div>
                          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                            {mt.label}
                          </div>
                          <div
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: active ? fill : 'transparent',
                              border: active ? 'none' : '1.5px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {active && <Check className="w-3.5 h-3.5" style={{ color: '#fff' }} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: 'var(--text)', marginBottom: 6,
                      }}
                    >
                      Un commentaire ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, maxLen))}
                      placeholder="Terrasse sympa, idéal pour le goûter…"
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 12,
                        border: '1px solid var(--border)', background: 'var(--surface)',
                        fontSize: 16, fontFamily: 'DM Sans', color: 'var(--text)',
                        resize: 'none', outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                      {comment.length}/{maxLen}
                    </div>
                  </div>
                </>
              )}

              {variant === 'comment' && (
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: 'var(--text)', marginBottom: 6,
                    }}
                  >
                    Votre commentaire
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, maxLen))}
                    placeholder="Un conseil pour les familles qui visitent ce lieu ?"
                    rows={5}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12,
                      border: '1px solid var(--border)', background: 'var(--surface)',
                      fontSize: 16, fontFamily: 'DM Sans', color: 'var(--text)',
                      resize: 'none', outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                    {comment.length}/{maxLen}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '14px 20px 32px', flexShrink: 0,
                borderTop: '1px solid var(--border)', background: 'var(--surface)',
              }}
            >
              <button
                onClick={handleSubmit}
                disabled={submitting || (user && !canSubmit)}
                className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ borderRadius: 100, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {user ? 'Envoyer' : 'Se connecter pour contribuer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContributeSheet;
