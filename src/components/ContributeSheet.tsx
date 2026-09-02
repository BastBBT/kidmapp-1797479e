import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { submitFailureText } from '@/lib/submitFailure';
import { useAuth } from '@/hooks/useAuth';
import { useMealTypes } from '@/hooks/useMeals';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@/hooks/useLocations';
import { MEAL_ICONS, EQUIP_ICONS, EQUIP_LABELS, EquipKey } from '@/assets/icons';
import { detectLanguage } from '@/lib/detectLanguage';
import { isActivity } from '@/types/location';
import { DURATIONS, WEATHERS, EFFORTS, PRICES } from '@/lib/activity';
import { AGE_RANGES } from '@/lib/ageFilter';
import { translateToken } from '@/i18n/tokenMaps';

interface Props {
  locationId: string;
  category: string;
  open: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
}

const MEAL_CATEGORIES = new Set(['restaurant', 'cafe']);
const MAX_COMMENT_MEAL = 2000;
const MAX_COMMENT_GENERIC = 2000;

type EquipValue = boolean | null;

const EQUIP_ITEMS: { key: EquipKey; label: string }[] = [
  { key: 'high_chair', label: EQUIP_LABELS.high_chair },
  { key: 'changing_table', label: EQUIP_LABELS.changing_table },
  { key: 'kids_area', label: EQUIP_LABELS.kids_area },
  { key: 'kids_menu', label: EQUIP_LABELS.kids_menu },
];

// Une activité n'affiche jamais les équipements bébé sur sa fiche : on lui
// demande ce qu'elle montre vraiment (durée / météo / effort / prix / âge).
type AgeChoice = '0-2' | '3-5' | '6+';
const AGE_CHOICES: { id: AgeChoice; key: string }[] = [
  { id: '0-2', key: 'filters.age.0_2' },
  { id: '3-5', key: 'filters.age.3_5' },
  { id: '6+', key: 'filters.age.6_plus' },
];

const ContributeSheet = ({ locationId, category, open, onClose, onRequireAuth }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: mealTypes = [] } = useMealTypes();
  const { data: location } = useLocation(locationId);
  const queryClient = useQueryClient();
  const variant = isActivity(category)
    ? 'activity'
    : MEAL_CATEGORIES.has(category)
      ? 'meals'
      : 'comment';
  const maxLen = variant === 'meals' ? MAX_COMMENT_MEAL : MAX_COMMENT_GENERIC;

  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [equipment, setEquipment] = useState<Record<EquipKey, EquipValue>>({
    high_chair: null,
    changing_table: null,
    kids_area: null,
    kids_menu: null,
  });
  const [duration, setDuration] = useState<string | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [effort, setEffort] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [age, setAge] = useState<AgeChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setComment('');
      setDuration(null);
      setWeather(null);
      setEffort(null);
      setPrice(null);
      setAge(null);
      // Pre-fill with current location values
      setEquipment({
        high_chair: location?.high_chair ?? null,
        changing_table: location?.changing_table ?? null,
        kids_area: location?.kids_area ?? null,
        kids_menu: (location as any)?.kids_menu ?? null,
      });
    }
  }, [open, location]);

  const sortedMealTypes = useMemo(
    () => [...mealTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [mealTypes]
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const setEquip = (key: EquipKey, value: EquipValue) =>
    setEquipment((e) => ({ ...e, [key]: value }));

  const hasEquipmentInput = Object.values(equipment).some((v) => v !== null);
  const hasActivityInput = [duration, weather, effort, price, age].some((v) => v !== null);

  const canSubmit =
    variant === 'meals'
      ? selected.length > 0 || hasEquipmentInput || comment.trim().length > 0
      : variant === 'activity'
        ? hasActivityInput || comment.trim().length > 0
        : comment.trim().length > 0 || hasEquipmentInput;

  const handleSubmit = async () => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const isMeals = variant === 'meals';
      const trimmedComment = comment.trim();
      const payload: any = isMeals
        ? { meal_types: selected, equipment, comment: trimmedComment || null }
        : variant === 'activity'
          ? {
              activity: {
                duration,
                weather,
                effort,
                price,
                // En mois (age_min_months / age_max_months une fois appliqué sur la fiche).
                // `age_unit: 'months'` distingue ces contributions de celles écrites avant le
                // 2026-08-31, où AGE_RANGES était encore en années — sans ce marqueur, le
                // lecteur (AdminPage) ne peut pas savoir dans quelle unité une ligne existante
                // a été écrite. Ne jamais retirer ce champ tant que d'anciennes contributions
                // sans marqueur peuvent encore être en attente.
                age_min: age ? AGE_RANGES[age].min : null,
                // « 6+ » n'a pas de borne haute : on n'envoie pas la borne de la tranche,
                // qui serait interprétée comme un âge max réel sur la fiche.
                age_max: age && age !== '6+' ? AGE_RANGES[age].max : null,
                age_unit: 'months',
              },
              comment: trimmedComment || null,
            }
          : { equipment, comment: trimmedComment };
      const detectedLang = trimmedComment ? detectLanguage(trimmedComment) : null;
      const { error } = await supabase.from('contributions').insert({
        location_id: locationId,
        user_id: user.id,
        type: isMeals ? 'meal_types' : variant === 'activity' ? 'activity_info' : 'comment',
        content: JSON.stringify(payload),
        status: 'pending',
        ...(detectedLang ? { language: detectedLang } : {}),
      } as any);
      if (error) throw error;

      toast.success(t('contribution.toast_success_title', { defaultValue: "Merci, c'est envoyé !" }), {
        description: t('contribution.toast_success_subtitle', { defaultValue: 'Vérifié sous 48h' }),
        duration: 5000,
        className: 'bg-secondary text-secondary-foreground border-none',
        descriptionClassName: 'text-secondary-foreground/85',
      });
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      onClose();
    } catch (err) {
      console.error('Insert into contributions failed:', err);
      toast.error(submitFailureText(err, t, t('submit_error.retry')));
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle =
    variant === 'meals'
      ? 'Quels repas avez-vous fait ici ?'
      : variant === 'activity'
        ? t('contribution.subtitle_activity', { defaultValue: 'Confirmez les infos de cette activité' })
        : 'Partagez votre expérience';

  const renderChoiceGroup = (
    title: string,
    options: readonly string[],
    namespace: 'duration' | 'weather' | 'effort' | 'price',
    value: string | null,
    onChange: (v: string | null) => void,
  ) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(active ? null : opt)}
              style={{
                padding: '8px 14px', borderRadius: 100,
                fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans',
                border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: active ? 'var(--primary)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {translateToken(namespace, opt)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderActivitySection = () => (
    <>
      {renderChoiceGroup(
        t('contribution.activity_duration', { defaultValue: 'Combien de temps y avez-vous passé ?' }),
        DURATIONS, 'duration', duration, setDuration,
      )}
      {renderChoiceGroup(
        t('contribution.activity_weather', { defaultValue: 'Ça marche par quel temps ?' }),
        WEATHERS, 'weather', weather, setWeather,
      )}
      {renderChoiceGroup(
        t('contribution.activity_effort', { defaultValue: "Niveau d'effort pour les enfants ?" }),
        EFFORTS, 'effort', effort, setEffort,
      )}
      {renderChoiceGroup(
        t('contribution.activity_price', { defaultValue: "C'est gratuit ou payant ?" }),
        PRICES, 'price', price, setPrice,
      )}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
          {t('contribution.activity_age', { defaultValue: 'Ça a plu à quel âge ?' })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AGE_CHOICES.map((choice) => {
            const active = age === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => setAge(active ? null : choice.id)}
                style={{
                  padding: '8px 14px', borderRadius: 100,
                  fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans',
                  border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {t(choice.key)}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const renderEquipmentSection = () => (
    <div style={{ marginTop: variant === 'meals' ? 22 : 0 }}>
      <div
        style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10,
        }}
      >
        Équipements disponibles ?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EQUIP_ITEMS.map((item) => {
          const value = equipment[item.key];
          return (
            <div
              key={item.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8, padding: 4,
                background: '#EBF4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <img src={EQUIP_ICONS[item.key]} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {item.label}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { v: true as EquipValue, label: 'Oui' },
                  { v: false as EquipValue, label: 'Non' },
                  { v: null as EquipValue, label: '?' },
                ].map((opt) => {
                  const active = value === opt.v;
                  return (
                    <button
                      key={String(opt.label)}
                      onClick={() => setEquip(item.key, opt.v)}
                      style={{
                        padding: '5px 10px', borderRadius: 100,
                        fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans',
                        border: active ? 'none' : '1px solid var(--border)',
                        background: active
                          ? (opt.v === true ? '#2E7D32' : opt.v === false ? 'var(--primary)' : 'var(--text-muted)')
                          : 'transparent',
                        color: active ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        minWidth: opt.label === '?' ? 30 : 40,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
                  <div
                    style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10,
                    }}
                  >
                    Repas
                  </div>
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
                              justifyContent: 'center', flexShrink: 0, padding: 5,
                            }}
                          >
                            {MEAL_ICONS[mt.id] ? (
                              <img src={MEAL_ICONS[mt.id]} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: 20 }}>{mt.emoji}</span>
                            )}
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
                </>
              )}

              {variant === 'activity' ? renderActivitySection() : renderEquipmentSection()}

              <div style={{ marginTop: 18 }}>
                <label
                  style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: 'var(--text)', marginBottom: 6,
                  }}
                >
                  {variant === 'comment'
                    ? 'Votre commentaire'
                    : <>Un commentaire ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span></>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, maxLen))}
                  placeholder={
                    variant === 'meals'
                      ? 'Terrasse sympa, idéal pour le goûter…'
                      : variant === 'activity'
                        ? t('contribution.activity_placeholder', { defaultValue: "Ex : prévoir des bottes, l'ombre manque l'été…" })
                        : 'Un conseil pour les familles qui visitent ce lieu ?'
                  }
                  rows={variant === 'comment' ? 5 : 3}
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
            </div>

            <div
              style={{
                padding: '14px 20px 32px', flexShrink: 0,
                borderTop: '1px solid var(--border)', background: 'var(--surface)',
              }}
            >
              <button
                onClick={handleSubmit}
                disabled={submitting || (!!user && !canSubmit)}
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
