import { useEffect, useState } from 'react';

export type RejectSubmissionType = 'contribution' | 'location' | 'event';

export interface RejectDialogProps {
  open: boolean;
  submissionType: RejectSubmissionType;
  submissionName: string;
  recipientEmail: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

const TYPE_LABEL: Record<RejectSubmissionType, string> = {
  contribution: 'cette contribution',
  location: 'cette proposition',
  event: 'cet événement',
};

export default function RejectDialog({
  open,
  submissionType,
  submissionName,
  recipientEmail,
  onCancel,
  onConfirm,
}: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const canSendEmail = !!recipientEmail;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={busy ? undefined : onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 18,
          padding: 20,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          Refuser {TYPE_LABEL[submissionType]}
        </div>
        {submissionName && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            {submissionName}
          </div>
        )}

        <label
          style={{
            display: 'block',
            fontFamily: 'Caveat',
            fontSize: 15,
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          Motif du refus (envoyé au proposeur par email) ✦
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            canSendEmail
              ? 'Explique en quelques mots pourquoi… Ce message sera envoyé à la personne.'
              : 'Cette proposition est anonyme — aucun email ne sera envoyé, laisse vide.'
          }
          disabled={!canSendEmail || busy}
          rows={5}
          maxLength={1000}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            fontFamily: 'DM Sans',
            fontSize: 16,
            resize: 'vertical',
            color: 'var(--text)',
          }}
        />
        <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {canSendEmail ? (
            <>
              📧 Sera envoyé à <strong>{recipientEmail}</strong> — {reason.length}/1000
              {reason.trim().length === 0 && ' · Vide = refus silencieux sans email'}
            </>
          ) : (
            <>Aucun destinataire — le refus sera enregistré sans notification.</>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              fontFamily: 'DM Sans',
              fontSize: 13,
              fontWeight: 600,
              padding: '10px 18px',
              borderRadius: 100,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(reason.trim());
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            style={{
              fontFamily: 'DM Sans',
              fontSize: 13,
              fontWeight: 600,
              padding: '10px 18px',
              borderRadius: 100,
              border: 'none',
              background: '#C62828',
              color: '#fff',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Envoi…' : canSendEmail && reason.trim() ? 'Refuser et envoyer' : 'Confirmer le refus'}
          </button>
        </div>
      </div>
    </div>
  );
}
