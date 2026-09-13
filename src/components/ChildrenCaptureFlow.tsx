import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, Plus } from 'lucide-react';
import { useChildren } from '@/hooks/useChildren';
import { Child, ageInMonths, childDisplayLabel } from '@/lib/children';
import ChildFormSheet from './ChildFormSheet';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1650,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 480, background: 'var(--bg)',
  borderRadius: '24px 24px 0 0',
  padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)',
  maxHeight: '80vh', overflowY: 'auto', animation: 'slideUp 0.3s ease',
};

const formatChildAge = (months: number, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  if (months < 24) return t('children.age_months', { count: months });
  return t('children.age_years', { count: Math.round(months / 12) });
};

/**
 * Écran 4 : liste des enfants du compte + ajout, montée à la racine de
 * l'app (pas dans une page) pour rester valable quel que soit l'onglet
 * actif. Ne rend rien tant que `wantsCaptureFlow` est faux.
 */
const ChildrenCaptureFlow = () => {
  const { t } = useTranslation();
  const { wantsCaptureFlow, closeCaptureFlow, children: kids } = useChildren();
  // undefined = formulaire fermé, null = création, Child = édition
  const [editing, setEditing] = useState<Child | null | undefined>(undefined);

  if (!wantsCaptureFlow) return null;

  return (
    <div onClick={closeCaptureFlow} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 21, fontWeight: 500, color: 'var(--text)' }}>
            {t('children.capture_title')}
          </div>
          <button onClick={closeCaptureFlow} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 18px' }}>
          {t('children.capture_subtitle')}
        </p>

        {kids.map((child) => (
          <button
            key={child.id}
            onClick={() => setEditing(child)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', marginBottom: 8, borderRadius: 14,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              cursor: 'pointer', textAlign: 'left',
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
          onClick={() => setEditing(null)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', borderRadius: 14, marginBottom: 20,
            border: '1.5px dashed var(--border)', background: 'transparent',
            color: 'var(--primary)', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          {t('children.add_child')}
        </button>

        <button
          onClick={closeCaptureFlow}
          style={{
            width: '100%', padding: 14, borderRadius: 100,
            border: 'none', background: 'var(--primary)', color: '#fff',
            fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {kids.length === 0 ? t('children.capture_later') : t('children.capture_done')}
        </button>
      </div>

      {editing !== undefined && <ChildFormSheet child={editing} onClose={() => setEditing(undefined)} />}
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
};

export default ChildrenCaptureFlow;
