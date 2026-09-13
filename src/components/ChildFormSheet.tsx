import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';
import { Child } from '@/lib/children';
import { useChildren } from '@/hooks/useChildren';

// Borne basse réelle de la contrainte `birth_year` en base (vérifiée le
// 2026-09-13) : ne jamais proposer une année que l'insert rejetterait.
const MIN_BIRTH_YEAR = 2005;

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1700,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 480, background: 'var(--bg)',
  borderRadius: '24px 24px 0 0',
  padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)',
  animation: 'slideUp 0.3s ease',
};

const fieldLabel: React.CSSProperties = {
  fontFamily: 'DM Sans', fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6,
};

interface ChildFormSheetProps {
  /** `undefined`/`null` = création. Un `Child` = édition. */
  child?: Child | null;
  onClose: () => void;
}

const ChildFormSheet = ({ child, onClose }: ChildFormSheetProps) => {
  const { t, i18n } = useTranslation();
  const { addChild, updateChild, deleteChild } = useChildren();
  const isEdit = !!child;
  const currentYear = new Date().getFullYear();

  const [firstName, setFirstName] = useState(child?.first_name ?? '');
  const [birthMonth, setBirthMonth] = useState(child?.birth_month ?? 1);
  const [birthYear, setBirthYear] = useState(child?.birth_year ?? currentYear - 2);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const years = Array.from({ length: currentYear - MIN_BIRTH_YEAR + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const save = async () => {
    setSaving(true);
    try {
      if (isEdit) await updateChild(child!.id, { firstName, birthMonth, birthYear });
      else await addChild({ firstName, birthMonth, birthYear });
      onClose();
    } catch (e) {
      console.error('save child failed', e);
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!child) return;
    setDeleting(true);
    try {
      await deleteChild(child.id);
      onClose();
    } catch (e) {
      console.error('delete child failed', e);
      setDeleting(false);
    }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 19, fontWeight: 500, color: 'var(--text)' }}>
            {isEdit ? t('children.form_title_edit') : t('children.form_title_add')}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <label style={fieldLabel}>{t('children.field_first_name')}</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={60}
          autoComplete="given-name"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontFamily: 'DM Sans', fontSize: 15, color: 'var(--text)', outline: 'none',
            marginBottom: 16, boxSizing: 'border-box',
          }}
        />

        <label style={fieldLabel}>{t('children.field_birth')}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select
            value={birthMonth}
            onChange={(e) => setBirthMonth(Number(e.target.value))}
            style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)' }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)' }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%', padding: 14, borderRadius: 100, border: 'none',
            background: 'var(--primary)', color: '#fff',
            fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '…' : t('common.save')}
        </button>

        {isEdit && !confirmingDelete && (
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{
              width: '100%', marginTop: 10, padding: 12, borderRadius: 100,
              border: '1.5px solid hsl(var(--destructive))', background: 'transparent',
              color: 'hsl(var(--destructive))', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Trash2 size={14} />
            {t('children.delete_cta')}
          </button>
        )}

        {isEdit && confirmingDelete && (
          <>
            <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
              {t('children.delete_confirm_message')}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setConfirmingDelete(false)}
                style={{ flex: 1, padding: 12, borderRadius: 100, border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ flex: 1, padding: 12, borderRadius: 100, border: 'none', background: 'hsl(var(--destructive))', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#fff', cursor: deleting ? 'wait' : 'pointer' }}
              >
                {deleting ? '…' : t('children.delete_confirm_cta')}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
};

export default ChildFormSheet;
