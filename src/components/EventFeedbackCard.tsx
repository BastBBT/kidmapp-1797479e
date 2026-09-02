import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useEventFeedback, Verdict } from '@/hooks/useEventFeedback';
import { toast } from '@/hooks/use-toast';

interface Props {
  eventId: string;
}

const MAX = 2000;

const EventFeedbackCard = ({ eventId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { mine, upsert } = useEventFeedback(eventId);
  const [editing, setEditing] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (mine && !editing) {
      setVerdict(mine.verdict);
      setComment(mine.comment ?? '');
    }
  }, [mine, editing]);

  const alreadyAnswered = !!mine && !editing;

  const handleVerdictTap = (v: Verdict) => {
    if (!user) {
      requireAuth(() => setVerdict(v), {
        message: t('event.feedback_auth_prompt'),
        mode: 'login',
      });
      return;
    }
    setVerdict(v);
  };

  const handleSubmit = () => {
    if (!verdict) return;
    if (!user) {
      requireAuth(() => handleSubmit(), { mode: 'login' });
      return;
    }
    upsert.mutate(
      { verdict, comment },
      {
        onSuccess: () => {
          setEditing(false);
          toast({ title: 'Merci pour ton retour !' });
        },
        onError: (e: any) => {
          toast({
            title: 'Impossible d\'enregistrer',
            description: e?.message ?? 'Réessaie plus tard',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (alreadyAnswered) {
    return (
      <div
        style={{
          background: '#FAF0EC',
          border: '1.5px solid rgba(217,95,59,0.18)',
          borderRadius: 'var(--radius)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>{mine!.verdict === 'up' ? '👍' : '👎'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500 }}>
              Merci pour ton retour !
            </div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {mine!.verdict === 'up' ? 'Tu as aimé cet événement' : 'Tu n\'as pas accroché'}
            </div>
          </div>
        </div>
        {mine!.comment && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'DM Sans',
              fontSize: 13,
              color: 'var(--text)',
              fontStyle: 'italic',
            }}
          >
            « {mine!.comment} »
          </div>
        )}
        <button
          onClick={() => setEditing(true)}
          style={{
            marginTop: 12,
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontFamily: 'DM Sans',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Modifier mon avis
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#FAF0EC',
        border: '1.5px solid rgba(217,95,59,0.18)',
        borderRadius: 'var(--radius)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>👋</span>
        <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500 }}>
          Tu y étais ? C'était comment ?
        </div>
      </div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Ton retour aide les autres familles à choisir.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {(['up', 'down'] as Verdict[]).map((v) => {
          const active = verdict === v;
          return (
            <button
              key={v}
              onClick={() => handleVerdictTap(v)}
              style={{
                flex: 1,
                padding: '12px 10px',
                borderRadius: 100,
                border: active
                  ? `2px solid ${v === 'up' ? '#3B7D6E' : '#D95F3B'}`
                  : '1.5px solid var(--border)',
                background: active ? (v === 'up' ? '#3B7D6E' : '#D95F3B') : '#fff',
                color: active ? '#fff' : 'var(--text)',
                fontFamily: 'DM Sans',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{v === 'up' ? '👍' : '👎'}</span>
              {v === 'up' ? 'J\'ai aimé' : 'Bof'}
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX))}
        placeholder="Un mot pour les autres familles ?"
        rows={2}
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--border)',
          background: '#fff',
          fontFamily: 'DM Sans',
          fontSize: 16,
          color: 'var(--text)',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div
        style={{
          fontFamily: 'DM Sans',
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'right',
          marginTop: 4,
        }}
      >
        {comment.length}/{MAX}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {editing && (
          <button
            onClick={() => {
              setEditing(false);
              setVerdict(mine?.verdict ?? null);
              setComment(mine?.comment ?? '');
            }}
            style={{
              padding: '12px 16px',
              borderRadius: 100,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'DM Sans',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!verdict || upsert.isPending}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 100,
            border: 'none',
            background: !verdict ? 'var(--border)' : 'var(--primary)',
            color: '#fff',
            fontFamily: 'DM Sans',
            fontSize: 14,
            fontWeight: 600,
            cursor: !verdict ? 'not-allowed' : 'pointer',
            boxShadow: !verdict ? 'none' : '0 6px 18px rgba(217,95,59,0.28)',
          }}
        >
          {upsert.isPending ? 'Enregistrement…' : 'Enregistrer mon avis'}
        </button>
      </div>
    </div>
  );
};

export default EventFeedbackCard;
