import { useState, useMemo, useEffect } from 'react';
import { X, Send, Loader2, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { submitFailureText } from '@/lib/submitFailure';
import { useAuth } from '@/hooks/useAuth';
import { useMealTypes } from '@/hooks/useMeals';
import { MEAL_ICONS, EQUIP_ICONS, CATEGORY_ICONS } from '@/assets/icons';

import { DURATIONS, WEATHERS, EFFORTS, PRICES } from '@/lib/activity';
import { isActivity } from '@/types/location';
import { ageToMonths, ageRangeError, type AgeUnit } from '@/lib/ageFormat';
import AgeRangeInput from '@/components/AgeRangeInput';

const PLACE_CATEGORY_OPTIONS: { id: string; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'cafe', label: 'Café' },
  { id: 'shop', label: 'Boutique' },
  { id: 'public', label: 'Lieu public' },
  { id: 'coiffeur', label: 'Coiffeur' },
  { id: 'librairie', label: 'Librairie' },
];

const ACTIVITY_CATEGORY_OPTIONS: { id: string; label: string }[] = [
  { id: 'nature', label: 'Nature' },
  { id: 'sport', label: 'Sport' },
  { id: 'creatif', label: 'Créatif' },
  { id: 'culture', label: 'Culture' },
  { id: 'jeux', label: 'Jeux' },
];

interface ProposeLocationModalProps {
  open: boolean;
  onClose: () => void;
  initialCategory?: string;
  mode?: 'location' | 'activity';
}

const FULL_STEPS = ['Infos', 'Équipements', 'Repas & horaires', 'Photos'] as const;
const SHORT_STEPS = ['Infos', 'Équipements', 'Photos'] as const;
const hasMealsStep = (category: string) => category === 'restaurant' || category === 'cafe';

const COPY = {
  location: {
    title: 'Proposer un lieu',
    nameLabel: 'Nom du lieu *',
    namePlaceholder: 'Ex: Le Petit Beurre',
    notePlaceholder: 'Un mot sur ce lieu…',
    successDesc: 'Merci ! On vérifie ce lieu avant publication.',
  },
  activity: {
    title: 'Proposer une activité',
    nameLabel: "Nom de l'activité *",
    namePlaceholder: 'Ex: Balade au jardin des Plantes',
    notePlaceholder: 'Un mot sur cette activité…',
    successDesc: 'Merci ! On vérifie cette activité avant publication.',
  },
} as const;

const ProposeLocationModal = ({ open, onClose, initialCategory = 'restaurant', mode = 'location' }: ProposeLocationModalProps) => {
  const copy = COPY[mode];
  const CATEGORY_OPTIONS = mode === 'activity' ? ACTIVITY_CATEGORY_OPTIONS : PLACE_CATEGORY_OPTIONS;

  const { toast } = useToast();

  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: mealTypes = [] } = useMealTypes();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    category: initialCategory,
    address: '',
    high_chair: false,
    changing_table: false,
    kids_area: false,
    kids_menu: false,
    bookable: 'unknown',
    note: '',
    website: '',
    instagram: '',
    age_min: '' as string,
    age_max: '' as string,
    age_unit: 'years' as AgeUnit,
    duration: '' as string,
    weather: '' as string,
    effort: '' as string,
    price: '' as string,
  });

  // Sync initialCategory when modal re-opens with a different context (e.g. from proposal chooser)
  useEffect(() => {
    if (open) {
      setForm((p) => ({ ...p, category: initialCategory }));
    }
     
  }, [open, initialCategory]);

  const updateForm = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  // Clamp step + reset meals if switching to a category without meals step
  const handleCategoryChange = (newCategory: string) => {
    setForm((p) => ({ ...p, category: newCategory }));
    if (!hasMealsStep(newCategory)) {
      setSelectedMeals([]);
      setStep((s) => (s >= SHORT_STEPS.length ? SHORT_STEPS.length - 1 : s));
    }
  };

  const resetAll = () => {
    setForm({
      name: '', category: initialCategory, address: '',
      high_chair: false, changing_table: false, kids_area: false, kids_menu: false,
      bookable: 'unknown', note: '', website: '', instagram: '',
      age_min: '', age_max: '', age_unit: 'years',
      duration: '', weather: '', effort: '', price: '',
    });
    setSelectedMeals([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrlInput('');
    setStep(0);
  };


  const handleClose = () => {
    onClose();
    setTimeout(resetAll, 300);
  };

  const canContinueStep0 = form.name.trim() && form.address.trim();

  const STEPS = hasMealsStep(form.category) ? FULL_STEPS : SHORT_STEPS;
  const isPhotosStep = step === STEPS.length - 1;
  const isMealsStep = hasMealsStep(form.category) && step === 2;

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
    const ageErr = ageRangeError(form.age_min, form.age_max, form.age_unit);
    if (ageErr) {
      toast({ title: 'Erreur', description: ageErr, variant: 'destructive' });
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
      } else if (photoUrlInput.trim()) {
        const trimmed = photoUrlInput.trim();
        if (trimmed.includes('supabase.co/storage')) {
          photoUrl = trimmed;
        } else {
          try {
            const { data, error } = await supabase.functions.invoke('proxy-image', {
              body: { url: trimmed },
            });
            if (!error && data?.url) {
              photoUrl = data.url as string;
            } else {
              photoUrl = null;
            }
          } catch {
            photoUrl = null;
          }
        }
      }

      const insertData: any = {
        user_id: user.id,
        name: form.name,
        category: form.category,
        address: form.address,
        high_chair: form.high_chair,
        changing_table: form.changing_table,
        kids_area: form.kids_area,
        kids_menu: form.kids_menu,
        note: form.note || null,
        photo: photoUrl,
        website: form.website || null,
        instagram: form.instagram || null,
        status: 'pending',
        metadata: { meal_types: selectedMeals },
        age_min_months: form.age_min.trim() === '' ? null : ageToMonths(Math.max(0, parseInt(form.age_min, 10)), form.age_unit) || null,
        age_max_months: form.age_max.trim() === '' ? null : ageToMonths(Math.max(0, parseInt(form.age_max, 10)), form.age_unit) || null,
      };
      if (form.category === 'restaurant' || form.category === 'cafe') {
        insertData.bookable = form.bookable;
      }
      if (isActivity(form.category)) {
        insertData.duration = form.duration || null;
        insertData.weather = form.weather || null;
        insertData.effort = form.effort || null;
        insertData.price = form.price || null;
      }
      const { error } = await supabase.from('location_proposals' as any).insert(insertData);
      if (error) throw error;
      toast({
        title: 'Proposition envoyée ✦',
        description: copy.successDesc,
      });
      handleClose();
    } catch (err) {
      // Un message par famille de cause, code technique affiché avec : voir
      // src/lib/submitFailure.ts.
      console.error('Insert into location_proposals failed:', err);
      toast({ title: 'Une erreur est survenue', description: submitFailureText(err, t, t('submit_error.retry')), variant: 'destructive' });
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
                    {copy.title}

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
                      {copy.nameLabel}
                    </label>
                    <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder={copy.namePlaceholder} style={inputStyle} />

                  </div>
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Catégorie *
                    </label>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4 }} className="scrollbar-hide">
                      {CATEGORY_OPTIONS.map((c) => {
                        const active = form.category === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleCategoryChange(c.id)}
                            style={{
                              flexShrink: 0, display: 'flex', flexDirection: 'column',
                              alignItems: 'center', gap: 6, padding: '8px 4px',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                            }}
                          >
                            <span style={{
                              width: 56, height: 56, borderRadius: '50%',
                              background: active ? 'var(--primary-light)' : 'var(--bg)',
                              border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all .15s',
                            }}>
                              <img src={CATEGORY_ICONS[c.id]} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                            </span>
                            <span style={{
                              fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600,
                              color: active ? 'var(--text)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                            }}>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
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
                      placeholder={copy.notePlaceholder}
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
                  {isActivity(form.category) ? (
                    <>
                      <div>
                        <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                          Détails activité
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                          Aide les familles à choisir la bonne activité.
                        </p>
                      </div>
                      <PillGroup label="Durée" options={DURATIONS as any} value={form.duration} onChange={(v) => updateForm('duration', v)} />
                      <PillGroup label="Météo" options={WEATHERS as any} value={form.weather} onChange={(v) => updateForm('weather', v)} />
                      <PillGroup label="Effort" options={EFFORTS as any} value={form.effort} onChange={(v) => updateForm('effort', v)} />
                      <PillGroup label="Prix" options={PRICES as any} value={form.price} onChange={(v) => updateForm('price', v)} />
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                          Équipements pour les enfants
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                          Coche ce qui est disponible.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <ToggleRow icon={EQUIP_ICONS.high_chair} label="Chaise haute / réhausseur" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                        <ToggleRow icon={EQUIP_ICONS.changing_table} label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                        <ToggleRow icon={EQUIP_ICONS.kids_area} label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
                        <ToggleRow icon={EQUIP_ICONS.kids_menu} label="Menu enfant" checked={form.kids_menu} onChange={(v) => updateForm('kids_menu', v)} />
                      </div>
                    </>
                  )}

                  {/* Age range (optional) */}
                  <div>
                    <AgeRangeInput
                      label="Âge conseillé (optionnel)"
                      minValue={form.age_min}
                      maxValue={form.age_max}
                      unit={form.age_unit}
                      onMinChange={(v) => updateForm('age_min', v)}
                      onMaxChange={(v) => updateForm('age_max', v)}
                      onUnitChange={(u) => updateForm('age_unit', u)}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'DM Sans' }}>
                      Laisse vide si adapté à tous les âges.
                    </div>
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

              {/* === STEP Repas & horaires (Café/Restaurant only) === */}
              {isMealsStep && (
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
                            justifyContent: 'center', flexShrink: 0, padding: 5,
                          }}>
                            {MEAL_ICONS[mt.id] ? (
                              <img src={MEAL_ICONS[mt.id]} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: 20 }}>{mt.emoji}</span>
                            )}
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

              {/* === STEP Photos (toujours dernier) === */}
              {isPhotosStep && (
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

                  {!photoFile && (
                    <div>
                      <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                        Ou colle une URL d'image
                      </label>
                      <input
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={photoUrlInput}
                        onChange={(e) => setPhotoUrlInput(e.target.value)}
                        placeholder="https://…"
                        style={inputStyle}
                      />
                      {photoUrlInput.trim() && isValidUrl(photoUrlInput.trim()) && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'DM Sans' }}>
                          L'image sera hébergée sur nos serveurs
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with action button */}
            <div style={{ padding: '14px 20px 32px', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={step === 0 ? !canContinueStep0 : isMealsStep ? selectedMeals.length === 0 : false}
                  className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm disabled:opacity-40 transition-opacity"
                  style={{ borderRadius: '100px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'DM Sans', cursor: 'pointer' }}
                >
                  {isMealsStep
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

function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

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

function ToggleRow({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; icon?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)' }}>
        {icon && (
          <span style={{
            width: 30, height: 30, borderRadius: 8, padding: 4,
            background: '#EBF4F2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={icon} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </span>
        )}
        {label}
      </span>
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

function PillGroup({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(active ? '' : opt)}
              style={{
                padding: '6px 14px', borderRadius: 100,
                border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: active ? 'var(--primary-light)' : 'var(--surface)',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProposeLocationModal;
