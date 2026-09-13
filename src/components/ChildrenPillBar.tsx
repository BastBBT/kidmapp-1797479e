import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Child, ChildFilterSelection, childDisplayLabel, childFilterEmoji } from '@/lib/children';

interface ChildrenPillBarProps {
  children: Child[];
  selection: ChildFilterSelection;
  onChange: (selection: ChildFilterSelection) => void;
}

const isSameSelection = (a: ChildFilterSelection, b: ChildFilterSelection): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'child' && b.kind === 'child') return a.id === b.id;
  return true;
};

interface Pill {
  key: string;
  label: string;
  value: ChildFilterSelection;
}

/**
 * Remplace `AgeFilter` dès qu'au moins un enfant est enregistré. Règle
 * d'affichage selon la fratrie (miroir iOS/Android) :
 * 1 enfant  -> [enfant, "Tous les âges"] (pas de pill "Les deux")
 * 2 enfants -> [enfant1, enfant2, "Les deux", "Tous les âges"]
 * 3+        -> ["Tous mes enfants" en tête, enfant1, enfant2, ..., "Tous les âges"]
 */
const ChildrenPillBar = ({ children, selection, onChange }: ChildrenPillBarProps) => {
  const { t } = useTranslation();

  const childPills: Pill[] = children.map((c) => ({
    key: c.id,
    label: `${childFilterEmoji(c.id)} ${childDisplayLabel(c, t('children.unnamed'))}`,
    value: { kind: 'child', id: c.id },
  }));

  const allLabel = children.length === 2 ? t('children.pill_both') : t('children.pill_all_mine');
  const allPill: Pill = { key: '__all__', label: allLabel, value: { kind: 'allChildren' } };
  const nonePill: Pill = { key: '__none__', label: t('children.pill_all_ages'), value: { kind: 'none' } };

  let pills: Pill[];
  if (children.length <= 1) {
    pills = [...childPills, nonePill];
  } else if (children.length === 2) {
    pills = [...childPills, allPill, nonePill];
  } else {
    pills = [allPill, ...childPills, nonePill];
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {t('filters.age_label')}
      </span>
      <div style={{ display: 'inline-flex', gap: 6 }} className="scrollbar-hide">
        {pills.map((pill) => {
          const active = isSameSelection(selection, pill.value);
          return (
            <motion.button
              key={pill.key}
              type="button"
              onClick={() => onChange(pill.value)}
              whileTap={{ scale: 0.95 }}
              style={{
                flexShrink: 0,
                padding: '4px 10px',
                borderRadius: 100,
                border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: active ? 'var(--primary-light)' : 'var(--surface)',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontFamily: 'DM Sans',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}
            >
              {pill.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ChildrenPillBar;
