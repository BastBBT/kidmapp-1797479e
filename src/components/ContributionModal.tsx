import { useState } from 'react';
import { Location } from '@/types/location';
import { Baby, UtensilsCrossed, TreePine, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
          value === true
            ? 'bg-success text-success-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        Oui ✓
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
          value === false
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        Non ✗
      </button>
    </div>
  </div>
);

const ContributionModal = ({ location, open, onClose }: ContributionModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [highChair, setHighChair] = useState<boolean | null>(null);
  const [changingTable, setChangingTable] = useState<boolean | null>(null);
  const [kidsArea, setKidsArea] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('contributions').insert({
      location_id: location.id,
      user_id: user.id,
      high_chair: highChair,
      changing_table: changingTable,
      kids_area: kidsArea,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Merci pour votre contribution ! 🎉',
      description: 'Votre signalement sera vérifié par notre équipe.',
    });
    onClose();
    setHighChair(null);
    setChangingTable(null);
    setKidsArea(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Contribuer</h2>
              <button onClick={onClose} className="p-2 rounded-full bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Confirmez les équipements de <strong>{location.name}</strong>
            </p>

            <div className="divide-y divide-border">
              <CriterionToggle
                label="Chaise haute"
                icon={<UtensilsCrossed className="w-4 h-4" />}
                value={highChair}
                onChange={setHighChair}
              />
              <CriterionToggle
                label="Table à langer"
                icon={<Baby className="w-4 h-4" />}
                value={changingTable}
                onChange={setChangingTable}
              />
              <CriterionToggle
                label="Espace jeux"
                icon={<TreePine className="w-4 h-4" />}
                value={kidsArea}
                onChange={setKidsArea}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={highChair === null && changingTable === null && kidsArea === null}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-bold text-sm disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
              Envoyer ma contribution
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContributionModal;
