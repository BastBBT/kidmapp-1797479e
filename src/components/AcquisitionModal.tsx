import { useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface AcquisitionModalProps {
  open: boolean;
  onClose: () => void;
}

type SourceValue =
  | 'social'
  | 'word_of_mouth'
  | 'partner_place'
  | 'search'
  | 'press'
  | 'other';

const OPTIONS: { value: SourceValue; emoji: string; label: string }[] = [
  { value: 'social', emoji: '📱', label: 'Réseaux sociaux' },
  { value: 'word_of_mouth', emoji: '💬', label: 'Bouche à oreille' },
  { value: 'partner_place', emoji: '📍', label: 'Un lieu partenaire' },
  { value: 'search', emoji: '🔎', label: 'Recherche web / App Store' },
  { value: 'press', emoji: '📰', label: 'Presse ou blog' },
  { value: 'other', emoji: '✨', label: 'Autre…' },
];

const FLAG_KEY = 'hasAnsweredAcquisition';

const setFlag = () => {
  try {
    localStorage.setItem(FLAG_KEY, 'true');
  } catch {
    // ignore
  }
};

const AcquisitionModal = ({ open, onClose }: AcquisitionModalProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<SourceValue | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSkip = () => {
    setFlag();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      if (user?.id) {
        const payload = {
          acquisition_source: selected,
          acquisition_detail: detail.trim() || null,
          acquisition_source_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('profiles')
          .update(payload as never)
          .eq('id', user.id);
        if (error) console.error('acquisition update error', error);
      }
    } catch (e) {
      console.error('acquisition submit error', e);
    } finally {
      setFlag();
      setBusy(false);
      onClose();
    }
  };

  const showDetail = selected === 'other';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          width: '100%',
          maxWidth: 440,
          padding: '22px 20px 24px',
          fontFamily: 'DM Sans',
          maxHeight: '92vh',
          overflowY: 'auto',
          animation: isMobile ? 'slideUp 0.25s ease' : 'fadeIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <h2
            style={{
              fontFamily: 'Fraunces',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Une dernière chose !
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Comment avez-vous découvert Kidmapp ? 🧡
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {OPTIONS.map((opt) => {
            const isSel = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: isSel
                    ? '1.5px solid #D95F3B'
                    : '1.5px solid rgba(0,0,0,0.08)',
                  background: isSel ? '#FFF8F5' : '#fff',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  fontSize: 14,
                  color: 'var(--text)',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{opt.emoji}</span>
                <span style={{ flex: 1, fontWeight: isSel ? 600 : 500 }}>{opt.label}</span>
                {isSel && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: '#D95F3B',
                      color: '#fff',
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {showDetail && (
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Dites-nous en quelques mots…"
            maxLength={280}
            rows={3}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.12)',
              fontFamily: 'DM Sans',
              fontSize: 16,
              color: 'var(--text)',
              resize: 'vertical',
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || busy}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '13px 16px',
            border: 'none',
            borderRadius: 100,
            cursor: !selected || busy ? 'not-allowed' : 'pointer',
            background: !selected ? 'rgba(217,95,59,0.35)' : '#D95F3B',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'DM Sans',
            transition: 'background 0.2s ease',
          }}
        >
          {busy ? 'Envoi…' : 'Valider'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={busy}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontFamily: 'DM Sans',
              textDecoration: 'underline',
              padding: '6px 10px',
            }}
          >
            Passer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AcquisitionModal;
