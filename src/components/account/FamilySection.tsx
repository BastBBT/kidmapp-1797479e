import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus } from 'lucide-react';
import { useChildren } from '@/hooks/useChildren';
import { Child, ageInMonths, childDisplayLabel } from '@/lib/children';
import ChildFormSheet from '@/components/ChildFormSheet';

const formatChildAge = (months: number, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  if (months < 24) return t('children.age_months', { count: months });
  return t('children.age_years', { count: Math.round(months / 12) });
};

/** Section "Ma famille" de Mon compte — jamais repliable, rend quelque chose
 *  tout de suite (liste des enfants + ajout). */
const FamilySection = () => {
  const { t } = useTranslation();
  const { children: kids } = useChildren();
  // undefined = formulaire fermé, null = création, Child = édition
  const [editingChild, setEditingChild] = useState<Child | null | undefined>(undefined);

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '12px' }}>
        {t('account.family_title')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {kids.map((child) => (
          <button
            key={child.id}
            onClick={() => setEditingChild(child)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              boxShadow: 'var(--shadow)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces', fontSize: 15, fontWeight: 600,
            }}>
              {childDisplayLabel(child, t('children.unnamed')).charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {childDisplayLabel(child, t('children.unnamed'))}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
                {formatChildAge(ageInMonths(child), t)}
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </button>
        ))}
        <button
          onClick={() => setEditingChild(null)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 14, borderRadius: 'var(--radius-sm)',
            border: '1.5px dashed var(--border)', background: 'transparent',
            color: 'var(--primary)', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          {t('children.add_child')}
        </button>
      </div>
      {kids.length === 0 && (
        <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          {t('account.family_empty_hint')}
        </div>
      )}
      {editingChild !== undefined && <ChildFormSheet child={editingChild} onClose={() => setEditingChild(undefined)} />}
    </div>
  );
};

export default FamilySection;
