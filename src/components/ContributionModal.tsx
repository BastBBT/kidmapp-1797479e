import { useState } from 'react';
import { Location } from '@/types/location';
import { X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface ContributionModalProps {
  location: Location;
  open: boolean;
  onClose: () => void;
}

const CriterionToggle = ({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
        {icon}
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className="px-4 py-1.5 text-xs font-bold transition-colors"
        style={{
          borderRadius: '100px',
          background: value === true ? '#2E7D32' : 'var(--bg)',
          color: value === true ? '#fff' : 'var(--text-muted)',
          border: value === true ? 'none' : '1px solid var(--border)',
        }}
      >
        Oui ✓
      </button>
      <button
        onClick={() => onChange(false)}
        className="px-4 py-1.5 text-xs font-bold transition-colors"
        style={{
          borderRadius: '100px',
          background: value === false ? '#D32F2F' : 'var(--bg)',
          color: value === false ? '#fff' : 'var(--text-muted)',
          border: value === false ? 'none' : '1px solid var(--border)',
        }}
      >
        Non ✗
      </button>
    </div>
  </div>
);

const HighChairIcon = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="11" y="4" width="14" height="10" rx="3"/><path d="M11 14 L8 26"/><path d="M25 14 L28 26"/><path d="M8 20 L28 20"/><path d="M14 26 L22 26"/>
  </svg>
);
const ChangingTableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="18" width="28" height="5" rx="2"/><path d="M7 18 L7 28"/><path d="M29 18 L29 28"/><circle cx="18" cy="11" r="4"/><path d="M14 15 Q18 21 22 15"/>
  </svg>
);
const KidsAreaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 28 L8 14 Q8 10 12 10 L24 10"/><path d="M8 28 L22 28"/><path d="M24 10 Q32 14 28 24 L22 28"/><circle cx="26" cy="26" r="3"/>
  </svg>
);

const ContributionModal = ({ location, open, onClose }: ContributionModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [highChair, setHighChair] = useState<boolean | null>(null);
  const [changingTable, setChangingTable] = useState<boolean | null>(null);
  const [kidsArea, setKidsArea] = useState<boolean | null>(null);
  const [bookable, setBookable] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showBookable = location.category === 'restaurant' || location.category === 'cafe';

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const insertData: any = {
        location_id: location.id,
        user_id: user.id,
        high_chair: highChair,
        changing_table: changingTable,
        kids_area: kidsArea,
        status: 'pending',
      };
      if (showBookable && bookable !== null) {
        insertData.bookable = bookable;
      }
      const { error } = await supabase.from('contributions').insert(insertData);
      if (error) throw error;
      toast({
        title: 'Merci pour ta contribution ✦',
        description: 'Elle sera vérifiée par notre équipe.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-contribution', location.id, user.id] });
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      onClose();
      setHighChair(null);
      setChangingTable(null);
      setKidsArea(null);
      setBookable(null);
    } catch (err: any) {
      toast({
        title: 'Une erreur est survenue',
        description: err?.message || 'Réessaie dans quelques instants.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000]"
            style={{ background: 'rgba(28,25,23,0.3)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col"
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius) var(--radius) 0 0', maxHeight: '85vh' }}
          >
            {/* Header - fixed */}
            <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Contribuer</h2>
                <button onClick={onClose} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Confirmez les équipements de <strong>{location.name}</strong>
              </p>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                <CriterionToggle label="Chaise haute" icon={<HighChairIcon />} value={highChair} onChange={setHighChair} />
                <CriterionToggle label="Table à langer" icon={<ChangingTableIcon />} value={changingTable} onChange={setChangingTable} />
                <CriterionToggle label="Espace jeux" icon={<KidsAreaIcon />} value={kidsArea} onChange={setKidsArea} />
              </div>

              {showBookable && (
                <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text)' }}>
                    Réservation possible ?
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['yes', 'no', 'unknown'] as const).map(val => (
                      <button key={val}
                        onClick={() => setBookable(val)}
                        style={{
                          flex: 1, padding: '10px 8px',
                          borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                          border: bookable === val ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                          background: bookable === val ? 'var(--primary-light)' : 'transparent',
                          color: bookable === val ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer', fontFamily: 'DM Sans',
                        }}>
                        {val === 'yes' ? 'Oui' : val === 'no' ? 'Non' : 'Je sais pas'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed submit button */}
            <div style={{ padding: '16px 20px 40px', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || (highChair === null && changingTable === null && kidsArea === null && bookable === null)}
                className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm disabled:opacity-40 transition-opacity"
                style={{ borderRadius: '100px', background: 'var(--primary)', color: '#fff' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer ma contribution
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContributionModal;
