import { useState } from 'react';
import { useEventFeedbackList } from '@/hooks/useEventFeedback';

interface Props {
  eventId: string;
}

const EventFeedbackAdmin = ({ eventId }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const { data: feedbacks = [], isLoading } = useEventFeedbackList(eventId, expanded);
  const { data: counts } = useEventFeedbackList(eventId);

  const up = counts?.filter((f) => f.verdict === 'up').length ?? 0;
  const down = counts?.filter((f) => f.verdict === 'down').length ?? 0;
  const withComments = feedbacks.filter((f) => f.comment && f.comment.trim().length > 0);
  const total = up + down;

  if (total === 0 && !expanded) return null;

  return (
    <div style={{ marginTop: 8, marginBottom: 8, padding: 8, background: 'var(--bg)', borderRadius: 8 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'DM Sans',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
          width: '100%',
        }}
      >
        <span>👍 {up}</span>
        <span>👎 {down}</span>
        {total > 0 && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            ({withComments.length > 0 ? `${withComments.length} commentaire${withComments.length > 1 ? 's' : ''}` : 'sans commentaire'})
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 8 }}>
          {isLoading && (
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>Chargement…</div>
          )}
          {!isLoading && feedbacks.length === 0 && (
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>Aucun avis pour le moment.</div>
          )}
          {feedbacks.map((f) => (
            <div
              key={f.id}
              style={{
                padding: 8,
                marginTop: 6,
                background: 'var(--surface)',
                borderRadius: 6,
                fontFamily: 'DM Sans',
                fontSize: 12,
                color: 'var(--text)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14 }}>{f.verdict === 'up' ? '👍' : '👎'}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {new Date(f.created_at).toLocaleDateString('fr-FR')} · {f.user_id.slice(0, 8)}
                </span>
              </div>
              {f.comment && (
                <div style={{ fontStyle: 'italic', color: 'var(--text)' }}>« {f.comment} »</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventFeedbackAdmin;
