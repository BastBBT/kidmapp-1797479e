import { RichNoteEditor } from '@/components/RichNote';
import { useEffect, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { submitFailureText } from '@/lib/submitFailure';
import { useAuth } from '@/hooks/useAuth';
import { useProposalModal } from '@/hooks/useProposalModal';
import { MAX_EVENT_PHOTOS, EVENT_CATEGORIES, EVENT_WEATHERS, eventCategoryEmoji } from '@/types/event';
import { DURATIONS } from '@/lib/activity';
import { ageToMonths, ageRangeError, type AgeUnit } from '@/lib/ageFormat';
import AgeRangeInput from '@/components/AgeRangeInput';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontFamily: 'DM Sans',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label
    style={{
      fontFamily: 'Caveat',
      fontSize: 13,
      color: 'var(--text-muted)',
      fontWeight: 500,
      display: 'block',
      marginBottom: 4,
    }}
  >
    {children}
  </label>
);

const Pills = ({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {options.map((opt) => {
      const active = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(active ? '' : opt)}
          style={{
            padding: '7px 14px',
            borderRadius: 100,
            border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
            background: active ? 'var(--primary-light)' : 'var(--surface)',
            color: active ? 'var(--primary)' : 'var(--text)',
            fontFamily: 'DM Sans',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const ProposeEventModal = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOpen, mode, close, setMode } = useProposalModal();
  const [submitting, setSubmitting] = useState(false);
  // Jusqu'à MAX_EVENT_PHOTOS photos ; la première sert de couverture (`photo`), les autres vont dans `photos`.
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);
  const [form, setForm] = useState({
    name: '',
    category: 'Spectacle' as string,
    address: '',
    date_start: '',
    date_end: '',
    time: '',
    age_min: '',
    age_max: '',
    age_unit: 'years' as AgeUnit,
    duration: '',
    weather: '',
    price: '',
    website: '',
    booking_url: '',
    instagram: '',
    note: '',
  });

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setForm({
      name: '', category: 'Spectacle', address: '', date_start: '', date_end: '',
      time: '', age_min: '', age_max: '', age_unit: 'years', duration: '', weather: '',
      price: '', website: '', booking_url: '', instagram: '', note: '',
    });
    setPhotoFiles([]);
  };

  const handleClose = () => {
    close();
    setTimeout(reset, 300);
  };

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const room = MAX_EVENT_PHOTOS - photoFiles.length;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (picked.length > room) {
      toast({ title: `${MAX_EVENT_PHOTOS} photos maximum`, variant: 'destructive' });
    }
    setPhotoFiles((prev) => [...prev, ...picked.slice(0, room)]);
  };

  const makeCover = (i: number) =>
    setPhotoFiles((prev) => [prev[i], ...prev.filter((_, j) => j !== i)]);

  const canSubmit = Boolean(form.name.trim() && form.category && form.date_start)
    && !ageRangeError(form.age_min, form.age_max, form.age_unit);

  const handleSubmit = async () => {
    if (!user) return;
    if (!canSubmit) {
      toast({ title: 'Champs requis', description: 'Nom, catégorie et date sont obligatoires.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      for (const file of photoFiles) {
        const ext = file.name.split('.').pop();
        // La policy RLS du bucket n'autorise l'écriture que sous `proposals/{auth.uid()}/...`
        // (ou admin) : tout autre préfixe fait échouer l'upload pour un utilisateur normal.
        const fileName = `proposals/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('location-photos').upload(fileName, file);
        // L'échec remonte au catch : classé `photo_upload` par submitFailure.ts,
        // message traduit + code technique, formulaire conservé pour réessayer.
        if (upErr) throw upErr;
        photoUrls.push(supabase.storage.from('location-photos').getPublicUrl(fileName).data.publicUrl);
      }

      const insertData: any = {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        address: form.address.trim() || null,
        date_start: form.date_start,
        date_end: form.date_end || null,
        time: form.time || null,
        age_min_months: form.age_min === '' ? null : ageToMonths(Math.max(0, parseInt(form.age_min, 10)), form.age_unit) || null,
        age_max_months: form.age_max === '' ? null : ageToMonths(Math.max(0, parseInt(form.age_max, 10)), form.age_unit) || null,
        duration: form.duration || null,
        weather: form.weather || null,
        price: form.price.trim() || null,
        website: form.website.trim() || null,
        booking_url: form.booking_url.trim() || null,
        instagram: form.instagram.trim() || null,
        note: form.note.trim() || null,
        photo: photoUrls[0] ?? null,
        photos: photoUrls.length > 1 ? photoUrls.slice(1) : null,
        status: 'pending',
      };

      const { error } = await supabase.from('events' as any).insert(insertData);
      if (error) throw error;

      toast({
        title: 'Événement envoyé ✦',
        description: 'Merci ! On vérifie avant publication.',
      });
      handleClose();
    } catch (err) {
      // Un message par famille de cause, code technique affiché avec : voir
      // src/lib/submitFailure.ts.
      console.error('Insert into events failed:', err);
      toast({
        title: t('common.error'),
        description: submitFailureText(err, t, t('submit_error.retry')),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const active = isOpen && mode === 'event';

  return (
    <AnimatePresence>
      {active && (
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
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius) var(--radius) 0 0',
              maxHeight: '92vh',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px 8px', flexShrink: 0 }}>
              <div className="flex items-center justify-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setMode('chooser')}
                    className="p-1.5 rounded-full"
                    style={{ background: 'var(--bg)' }}
                    aria-label="Retour"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
                    Proposer un événement
                  </h2>
                </div>
                <button onClick={handleClose} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>
              <div className="flex flex-col gap-4">
                <div>
                  <Label>Nom de l'événement *</Label>
                  <input
                    style={inputStyle}
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Ex: Festival des petites bêtes"
                  />
                </div>

                <div>
                  <Label>Catégorie *</Label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {EVENT_CATEGORIES.map((cat) => {
                      const isActive = form.category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => update('category', cat)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: 100,
                            border: isActive ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                            background: isActive ? 'var(--primary-light)' : 'var(--surface)',
                            color: isActive ? 'var(--primary)' : 'var(--text)',
                            fontFamily: 'DM Sans',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {eventCategoryEmoji(cat)} {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Adresse</Label>
                  <input
                    style={inputStyle}
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Ex: 6 rue Saint-Léonard, 44000 Nantes"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'DM Sans' }}>
                    Elle sera géolocalisée à l'approbation.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <Label>Date début *</Label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={form.date_start}
                      onChange={(e) => update('date_start', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date fin</Label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={form.date_end}
                      onChange={(e) => update('date_end', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Heure</Label>
                  <input
                    type="time"
                    style={inputStyle}
                    value={form.time}
                    onChange={(e) => update('time', e.target.value)}
                  />
                </div>

                <AgeRangeInput
                  minValue={form.age_min}
                  maxValue={form.age_max}
                  unit={form.age_unit}
                  onMinChange={(v) => update('age_min', v)}
                  onMaxChange={(v) => update('age_max', v)}
                  onUnitChange={(u) => update('age_unit', u)}
                />

                <div>
                  <Label>Durée</Label>
                  <Pills options={DURATIONS as unknown as string[]} value={form.duration} onChange={(v) => update('duration', v)} />
                </div>

                <div>
                  <Label>Météo</Label>
                  <Pills options={EVENT_WEATHERS as unknown as string[]} value={form.weather} onChange={(v) => update('weather', v)} />
                </div>

                <div>
                  <Label>Prix</Label>
                  <input
                    style={inputStyle}
                    value={form.price}
                    onChange={(e) => update('price', e.target.value)}
                    placeholder="Ex: Gratuit, 8 € / adulte, 5 € / enfant…"
                  />
                </div>

                <div>
                  <Label>Lien billetterie / site web</Label>
                  <input
                    style={inputStyle}
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://…"
                  />
                </div>

                <div>
                  <Label>Lien de réservation (si différent)</Label>
                  <input
                    style={inputStyle}
                    value={form.booking_url}
                    onChange={(e) => update('booking_url', e.target.value)}
                    placeholder="https://…"
                  />
                </div>

                <div>
                  <Label>Instagram (optionnel)</Label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        fontFamily: 'DM Sans',
                        fontSize: 14,
                      }}
                    >
                      @
                    </span>
                    <input
                      style={{ ...inputStyle, paddingLeft: 30 }}
                      value={form.instagram}
                      onChange={(e) => update('instagram', e.target.value)}
                      placeholder="compte_instagram"
                    />
                  </div>
                </div>

                <div>
                  <Label>Photos (optionnelles, {MAX_EVENT_PHOTOS} max)</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {photoPreviews.map((src, i) => (
                      <div key={src} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden' }}>
                        <img src={src} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          aria-label={`Retirer la photo ${i + 1}`}
                          onClick={() => setPhotoFiles((prev) => prev.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                        {i === 0 ? (
                          <span style={{ position: 'absolute', left: 5, bottom: 5, background: 'var(--primary)', color: '#fff', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
                            Couverture
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makeCover(i)}
                            style={{ position: 'absolute', left: 5, bottom: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', fontFamily: 'DM Sans', fontSize: 10, padding: '2px 7px', borderRadius: 99, cursor: 'pointer' }}
                          >
                            En couverture
                          </button>
                        )}
                      </div>
                    ))}
                    {photoFiles.length < MAX_EVENT_PHOTOS && (
                      <label style={{ aspectRatio: '1 / 1', borderRadius: 12, border: '1.5px dashed var(--primary)', color: 'var(--primary)', display: 'grid', placeItems: 'center', textAlign: 'center', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <span><b style={{ display: 'block', fontSize: 22, lineHeight: 1 }}>＋</b>Ajouter</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    La première photo sert de couverture sur la liste.
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <RichNoteEditor
                    rows={4}
                    textareaStyle={inputStyle}
                    value={form.note}
                    onChange={(v) => update('note', v)}
                    placeholder="Décris l'événement en quelques mots…"
                  />
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                    {form.note.length}/2000
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 100,
                  border: 'none',
                  background: canSubmit && !submitting ? 'var(--primary)' : 'var(--border)',
                  color: '#fff',
                  fontFamily: 'DM Sans',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Envoi…' : 'Envoyer la proposition'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProposeEventModal;
