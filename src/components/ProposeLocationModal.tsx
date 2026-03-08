import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProposeLocationModalProps {
  open: boolean;
  onClose: () => void;
}

const ProposeLocationModal = ({ open, onClose }: ProposeLocationModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'restaurant',
    address: '',
    high_chair: false,
    changing_table: false,
    kids_area: false,
    note: '',
  });

  const updateForm = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name || !form.address) {
      toast({ title: 'Champs requis', description: 'Nom, catégorie et adresse sont obligatoires.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('location_proposals' as any).insert({
        user_id: user.id,
        name: form.name,
        category: form.category,
        address: form.address,
        high_chair: form.high_chair,
        changing_table: form.changing_table,
        kids_area: form.kids_area,
        note: form.note || null,
        status: 'pending',
      });
      if (error) throw error;
      toast({
        title: 'Proposition envoyée ✦',
        description: 'Merci ! On la vérifie avant de la publier.',
      });
      onClose();
      setForm({ name: '', category: 'restaurant', address: '', high_chair: false, changing_table: false, kids_area: false, note: '' });
    } catch (err: any) {
      toast({ title: 'Une erreur est survenue', description: err?.message || 'Réessaie dans quelques instants.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    fontFamily: 'DM Sans',
    fontSize: '14px',
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(28,25,23,0.3)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-6 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius) var(--radius) 0 0' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 style={{ fontFamily: 'Fraunces', fontSize: '20px', fontWeight: 500, color: 'var(--text)' }}>
                Proposer un lieu
              </h2>
              <button onClick={onClose} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Aidez la communauté ✦
            </p>

            <div className="flex flex-col gap-4">
              {/* Nom */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Nom du lieu *
                </label>
                <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ex: Le Petit Beurre" style={inputStyle} />
              </div>

              {/* Catégorie */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Catégorie *
                </label>
                <select value={form.category} onChange={(e) => updateForm('category', e.target.value)} style={inputStyle}>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="cafe">☕ Café</option>
                  <option value="shop">🛍️ Boutique</option>
                  <option value="public">🌳 Lieu public</option>
                </select>
              </div>

              {/* Adresse */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Adresse *
                </label>
                <input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="12 Rue Crébillon, Nantes" style={inputStyle} />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3">
                <ToggleRow label="Chaise haute" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                <ToggleRow label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                <ToggleRow label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
              </div>

              {/* Note */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Note optionnelle
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => updateForm('note', e.target.value.slice(0, 200))}
                  placeholder="Un mot sur ce lieu…"
                  maxLength={200}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
                <div style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                  {form.note.length}/200
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.name || !form.address}
                className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm disabled:opacity-40 transition-opacity"
                style={{ borderRadius: '100px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'DM Sans', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Envoi…' : 'Envoyer la proposition'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: '100px', border: 'none',
          background: checked ? 'var(--primary)' : 'var(--border)',
          position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

export default ProposeLocationModal;
