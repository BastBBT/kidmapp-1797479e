import { useState } from 'react';
import { Loader2, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 480, background: 'var(--bg)',
  borderRadius: '24px 24px 0 0',
  padding: '24px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
  animation: 'slideUp 0.3s ease',
};

export const DeleteAccountSection = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (loading) return;
    setStep(0); setReason(''); setConfirmText('');
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { reason: reason.trim() || null },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any)?.error || 'delete failed');
      }
      toast.success('Compte supprimé');
      await signOut().catch(() => {});
      navigate('/', { replace: true });
    } catch (e) {
      console.error(e);
      toast.error('Une erreur est survenue. Réessaie ou contacte le support.');
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{
        marginTop: 40, padding: '24px 16px 0',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500,
          letterSpacing: '-0.02em', marginBottom: 6,
          color: 'hsl(var(--destructive))',
        }}>
          Zone dangereuse
        </div>
        <div style={{
          fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)',
          lineHeight: 1.5, marginBottom: 14,
        }}>
          La suppression de ton compte est définitive et efface toutes tes données.
        </div>
        <button
          onClick={() => setStep(1)}
          style={{
            width: '100%', padding: 14, borderRadius: 100,
            border: '1.5px solid hsl(var(--destructive))',
            background: 'transparent',
            color: 'hsl(var(--destructive))',
            fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Trash2 size={16} />
          Supprimer mon compte
        </button>
      </div>

      {step === 1 && (
        <div onClick={close} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={sheet}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertTriangle size={22} style={{ color: 'hsl(var(--destructive))' }} />
                <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>
                  Supprimer ton compte ?
                </div>
              </div>
              <button onClick={close} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>
            <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Cette action est irréversible. Toutes tes données (favoris, contributions, propositions) seront définitivement effacées.
            </p>
            <label style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Pourquoi pars-tu ? (optionnel)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ton retour nous aide à améliorer Kidmapp"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                fontFamily: 'DM Sans', fontSize: 16, color: 'var(--text)',
                outline: 'none', resize: 'none', marginBottom: 18,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={close}
                style={{
                  flex: 1, padding: 14, borderRadius: 100,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                  color: 'var(--text)', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1, padding: 14, borderRadius: 100,
                  border: 'none', background: 'hsl(var(--destructive))',
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Oui, supprimer
              </button>
            </div>
          </div>
          <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        </div>
      )}

      {step === 2 && (
        <div onClick={close} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={sheet}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>
                Confirme la suppression
              </div>
              <button onClick={close} disabled={loading} style={{ background: 'transparent', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>
            <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 14px' }}>
              Saisis <strong style={{ color: 'var(--text)' }}>supprimer</strong> pour confirmer.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="supprimer"
              autoComplete="off"
              disabled={loading}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                fontFamily: 'DM Sans', fontSize: 16, color: 'var(--text)',
                outline: 'none', marginBottom: 18,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={close}
                disabled={loading}
                style={{
                  flex: 1, padding: 14, borderRadius: 100,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                  color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'supprimer'}
                style={{
                  flex: 1, padding: 14, borderRadius: 100,
                  border: 'none', background: 'hsl(var(--destructive))',
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                  color: '#fff',
                  cursor: loading || confirmText !== 'supprimer' ? 'not-allowed' : 'pointer',
                  opacity: loading || confirmText !== 'supprimer' ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
          <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        </div>
      )}
    </>
  );
};

export default DeleteAccountSection;
