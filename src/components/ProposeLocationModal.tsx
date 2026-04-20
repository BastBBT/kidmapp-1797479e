import { useState, useMemo } from 'react';
import { X, Send, Loader2, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMealTypes } from '@/hooks/useMeals';

interface ProposeLocationModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ['Infos', 'Équipements', 'Repas & horaires', 'Photos'] as const;

const ProposeLocationModal = ({ open, onClose }: ProposeLocationModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: mealTypes = [] } = useMealTypes();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
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

  const resetAll = () => {
    setForm({
      name: '', category: 'restaurant', address: '',
      high_chair: false, changing_table: false, kids_area: false,
      bookable: 'unknown', note: '', website: '', instagram: '',
    });
    setSelectedMeals([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setStep(0);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetAll, 300);
  };

  const canContinueStep0 = form.name.trim() && form.address.trim();

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const toggleMeal = (id: string) =>
    setSelectedMeals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const applyShortcut = (ids: string[]) => setSelectedMeals(ids);

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name || !form.address) {
      toast({ title: 'Champs requis', description: 'Nom, catégorie et adresse sont obligatoires.', variant: 'destructive' });
      setStep(0);
      return;
    }
    setSubmitting(true);
    try {
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
        metadata: { meal_types: selectedMeals },
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
      handleClose();
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

  const sortedMeals = useMemo(
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
            style={{ background: 'rgba(28,25,23,0.3)' }}
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col"
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius) var(--radius) 0 0', maxHeight: '90vh' }}
          >
            {/* Header */}
            <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {step > 0 && (
                    <button
                      onClick={goPrev}
                      className="p-1.5 rounded-full"
                      style={{ background: 'var(--bg)' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <h2 style={{ fontFamily: 'Fraunces', fontSize: '20px', fontWeight: 500, color: 'var(--text)' }}>
                    Proposer un lieu
                  </h2>
                </div>
                <button onClick={handleClose} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {STEPS.map((label, i) => (
                  <div key={label} style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 4, borderRadius: 100,
                        background: i <= step ? 'var(--primary)' : 'var(--border)',
                        transition: 'background .25s',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {STEPS.map((label, i) => (
                  <div
                    key={label}
                    style={{
                      flex: 1, fontFamily: 'DM Sans', fontSize: 10,
                      textAlign: 'center', fontWeight: 600,
                      color: i === step ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Body — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 16px' }}>
              {/* === STEP 0: Infos === */}
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Nom du lieu *
                    </label>
                    <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ex: Le Petit Beurre" style={inputStyle} />
                  </div>
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
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Adresse *
                    </label>
                    <input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Ex: 6 rue Saint-Léonard, 44000 Nantes" style={inputStyle} />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Sans' }}>
                      Incluez le numéro, la rue et le code postal pour de meilleurs résultats.
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Site web
                    </label>
                    <input value={form.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://www.lepetitbeurre.fr" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Instagram
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '14px' }}>@</span>
                      <input value={form.instagram} onChange={(e) => updateForm('instagram', e.target.value)} placeholder="lepetitbeurre_nantes" style={{ ...inputStyle, paddingLeft: '30px' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Note optionnelle
                    </label>
                    <textarea
                      value={form.note}
                      onChange={(e) => updateForm('note', e.target.value.slice(0, 500))}
                      placeholder="Un mot sur ce lieu…"
                      maxLength={500}
                      rows={3}
                      style={{ ...inputStyle, resize: 'none' }}
                    />
                    <div style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                      {form.note.length}/500
                    </div>
                  </div>
                </div>
              )}

              {/* === STEP 1: Équipements === */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                      Équipements pour les enfants
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Coche ce qui est disponible.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <ToggleRow label="Chaise haute" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                    <ToggleRow label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                    <ToggleRow label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
                  </div>
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
                </div>
              )}

              {/* === STEP 2: Repas & horaires === */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                      Quand c'est ouvert ?
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Sélectionne les services disponibles. Tu pourras préciser les horaires par la suite.
                    </p>
                  </div>

                  {/* Shortcuts */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'DM Sans' }}>
                      Raccourcis
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="scrollbar-hide">
                      <ShortcutChip label="🌅 Petit format matin" onClick={() => applyShortcut(['petitdej', 'brunch', 'dejeuner'])} />
                      <ShortcutChip label="☀️ Journée famille" onClick={() => applyShortcut(['dejeuner', 'gouter'])} />
                      <ShortcutChip label="🌙 Midi & soir" onClick={() => applyShortcut(['dejeuner', 'diner'])} />
                    </div>
                  </div>

                  {/* Meal cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sortedMeals.map((mt) => {
                      const active = selectedMeals.includes(mt.id);
                      const fill = mt.fill_hex || 'var(--primary)';
                      const bg = mt.bg_hex || 'var(--bg)';
                      return (
                        <button
                          key={mt.id}
                          onClick={() => toggleMeal(mt.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 14,
                            border: active ? `1.5px solid ${fill}` : '1px solid var(--border)',
                            background: active ? bg : 'var(--surface)',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'all .15s',
                          }}
                        >
                          <div style={{
                            width: 38, height: 38, borderRadius: 12,
                            background: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 20, flexShrink: 0,
                          }}>
                            {mt.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                              {mt.label}
                            </div>
                            {mt.default_time_start && mt.default_time_end && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                Généralement {mt.default_time_start} – {mt.default_time_end}
                              </div>
                            )}
                          </div>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: active ? fill : 'transparent',
                            border: active ? 'none' : '1.5px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {active && <Check className="w-3.5 h-3.5" style={{ color: '#fff' }} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => { setSelectedMeals([]); goNext(); }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontFamily: 'DM Sans',
                      fontSize: 13, textDecoration: 'underline', textAlign: 'center',
                      padding: '8px', alignSelf: 'center',
                    }}
                  >
                    Je ne sais pas encore
                  </button>
                </div>
              )}

              {/* === STEP 3: Photos === */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                      Une photo du lieu ?
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Optionnel — mais ça aide vraiment les autres familles ✨
                    </p>
                  </div>
                  {photoPreview ? (
                    <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
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
                      gap: '8px', padding: '32px 20px',
                      border: '1.5px dashed var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', background: 'var(--bg)',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
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
              )}
            </div>

            {/* Footer with action button */}
            <div style={{ padding: '14px 20px 32px', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={step === 0 ? !canContinueStep0 : step === 2 ? selectedMeals.length === 0 : false}
                  className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm disabled:opacity-40 transition-opacity"
                  style={{ borderRadius: '100px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'DM Sans', cursor: 'pointer' }}
                >
                  {step === 2
                    ? `Continuer (${selectedMeals.length} service${selectedMeals.length > 1 ? 's' : ''} sélectionné${selectedMeals.length > 1 ? 's' : ''})`
                    : 'Continuer'}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.name || !form.address}
                  className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm disabled:opacity-40 transition-opacity"
                  style={{ borderRadius: '100px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'DM Sans', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Envoi…' : 'Envoyer la proposition'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function ShortcutChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '8px 14px', borderRadius: 100,
        background: 'var(--surface)', border: '1px solid var(--border)',
        color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12,
        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

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
