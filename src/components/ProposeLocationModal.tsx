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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'restaurant',
    address: '',
    high_chair: false,
    changing_table: false,
    kids_area: false,
    bookable: 'unknown',
    note: '',
    website: '',
    instagram: '',
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
      // Upload photo if present
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `proposals/${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('location-photos')
          .upload(fileName, photoFile);
        if (uploadError) {
          toast({ title: 'Erreur upload photo', description: 'Réessaie ou continue sans photo.', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage
          .from('location-photos')
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      const insertData: any = {
        user_id: user.id,
        name: form.name,
        category: form.category,
        address: form.address,
        high_chair: form.high_chair,
        changing_table: form.changing_table,
        kids_area: form.kids_area,
        note: form.note || null,
        photo: photoUrl,
        website: form.website || null,
        instagram: form.instagram || null,
        status: 'pending',
      };
      if (form.category === 'restaurant' || form.category === 'cafe') {
        insertData.bookable = form.bookable;
      }
      const { error } = await supabase.from('location_proposals' as any).insert(insertData);
      if (error) throw error;
      toast({
        title: 'Proposition envoyée ✦',
        description: 'Merci ! On la vérifie avant de la publier.',
      });
      onClose();
      setForm({ name: '', category: 'restaurant', address: '', high_chair: false, changing_table: false, kids_area: false, bookable: 'unknown', note: '', website: '', instagram: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
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
            className="fixed inset-0 z-[1000]"
            style={{ background: 'rgba(28,25,23,0.3)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius) var(--radius) 0 0', padding: '24px 20px 32px' }}
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
                  <option value="coiffeur">✂️ Coiffeur</option>
                </select>
              </div>

              {/* Adresse */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Adresse *
                </label>
                <input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Ex: 6 rue Saint-Léonard, 44000 Nantes" style={inputStyle} />
                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px', fontFamily:'DM Sans'}}>
                  Incluez le numéro, la rue et le code postal pour de meilleurs résultats.
                </div>
              </div>

              {/* Website */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Site web
                </label>
                <input
                  value={form.website}
                  onChange={(e) => updateForm('website', e.target.value)}
                  placeholder="https://www.lepetitbeurre.fr"
                  style={inputStyle}
                />
              </div>

              {/* Instagram */}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Instagram
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '14px' }}>@</span>
                  <input
                    value={form.instagram}
                    onChange={(e) => updateForm('instagram', e.target.value)}
                    placeholder="lepetitbeurre_nantes"
                    style={{ ...inputStyle, paddingLeft: '30px' }}
                  />
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '7px', fontFamily: 'DM Sans' }}>
                  Photo du lieu
                </label>
                {photoPreview ? (
                  <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                    <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.5)', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: '28px', height: '28px',
                        cursor: 'pointer', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column' as const,
                    alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '20px',
                    border: '1.5px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', background: 'var(--bg)',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Ajouter une photo ✦
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                      JPG, PNG — 5 Mo max
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast({ title: 'Photo trop lourde', description: '5 Mo maximum.', variant: 'destructive' });
                          return;
                        }
                        setPhotoFile(file);
                        setPhotoPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3">
                <ToggleRow label="Chaise haute" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                <ToggleRow label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                <ToggleRow label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
              </div>

              {/* Bookable - only for restaurant & cafe */}
              {(form.category === 'restaurant' || form.category === 'cafe') && (
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Réservation
                  </label>
                  <select value={form.bookable} onChange={(e) => updateForm('bookable', e.target.value)} style={inputStyle}>
                    <option value="unknown">Non renseigné</option>
                    <option value="yes">Accepte les réservations</option>
                    <option value="no">Sans réservation</option>
                  </select>
                </div>
              )}

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
