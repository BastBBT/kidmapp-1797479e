import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FUNNEL_WINDOWS, buildFunnelSteps, type FunnelCounts, type FunnelStep, type FunnelWindow } from './engagementFunnel';

type Segment = { with: { users: number; active: number }; without: { users: number; active: number } };
type TemplateSends = {
  emailSent: number;
  emailFailed: number;
  emailSuppressed: number;
  skippedNoMatch: number;
  pushSent: number;
  pushFailed: number;
  /** Run entier annulé (`new-location-alert` seulement aujourd'hui). */
  runAborted?: number;
};

/** Forme renvoyée par la RPC `admin_engagement_stats` (supabase/migrations/20260924210800, bloc `funnel` : 20261028220000). */
type EngagementStats = {
  registered: number;
  assistant: { opens: number; completions: number; users: number; completers: number };
  profile: {
    withChildren: number;
    withChildFirstName: number;
    childrenTotal: number;
    withZone: number;
    digestEmail: number;
    digestPush: number;
    complete: number;
  };
  pushDevices: { ios: number; android: number };
  sends30d: Record<'weekly-digest' | 'new-location-alert', TemplateSends>;
  digestFeedback30d: { sends: number; reactions: { love: number; neutral: number; sad: number }; unsubscribes: number };
  alertUnsubscribes30d: number;
  landingVisits30d: { semaine: number; nouveauxLieux: number };
  retentionBySegment: Record<'assistantCompleted' | 'hasChildren' | 'digestEnabled', Segment>;
  /** Entonnoir par cohorte d'inscription (migration 20261028220000). Absent tant qu'elle n'est pas appliquée. */
  funnel?: Partial<Record<FunnelWindow, FunnelCounts>>;
};

const EMPTY_SENDS: TemplateSends = { emailSent: 0, emailFailed: 0, emailSuppressed: 0, skippedNoMatch: 0, pushSent: 0, pushFailed: 0 };
const EMPTY_SEGMENT: Segment = { with: { users: 0, active: 0 }, without: { users: 0, active: 0 } };

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)',
};
const cardTitle: React.CSSProperties = {
  fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '10px',
};
const sectionTitle: React.CSSProperties = {
  fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', margin: '24px 0 8px', fontWeight: 500,
};
const muted: React.CSSProperties = { fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' };

const fmt = (n: number) => n.toLocaleString('fr-FR');
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export function EngagementTab({ isAdmin }: { isAdmin: boolean }) {
  const [funnelWindow, setFunnelWindow] = useState<FunnelWindow>('30');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-engagement-stats'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_engagement_stats');
      if (error) throw error;
      return data as unknown as EngagementStats;
    },
  });

  if (isLoading) return <div style={{ ...muted, textAlign: 'center', padding: '24px 0' }}>Chargement…</div>;
  if (error || !data) {
    return <div style={{ ...muted, textAlign: 'center', padding: '24px 0' }}>Impossible de charger les stats d'engagement.</div>;
  }

  const { registered, assistant, profile, pushDevices, digestFeedback30d: feedback } = data;
  const digest = data.sends30d?.['weekly-digest'] ?? EMPTY_SENDS;
  const alerts = data.sends30d?.['new-location-alert'] ?? EMPTY_SENDS;
  const funnelCounts = data.funnel?.[funnelWindow];
  const reactionsTotal = feedback.reactions.love + feedback.reactions.neutral + feedback.reactions.sad;
  const segments: { key: keyof EngagementStats['retentionBySegment']; label: string }[] = [
    { key: 'assistantCompleted', label: '🧸 A terminé l’assistant' },
    { key: 'hasChildren', label: '👶 A renseigné ≥ 1 enfant' },
    { key: 'digestEnabled', label: '📬 Reçoit la sélection hebdo' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ ...sectionTitle, margin: 0 }}>Parcours des familles inscrites ✦</div>
        <WindowToggle value={funnelWindow} onChange={setFunnelWindow} />
      </div>
      <div style={card}>
        {funnelCounts ? (
          <>
            {funnelWindow === '7' && (
              <div style={{ ...muted, background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', marginBottom: '10px' }}>
                Cohorte récente : les dernières étapes n’ont pas encore eu le temps de se remplir, à lire avec prudence.
              </div>
            )}
            {buildFunnelSteps(funnelCounts).map((step, i) => (
              <FunnelRow
                key={step.key}
                step={step}
                first={i === 0}
                detail={step.key === 'receivedSend' ? `dont email ${fmt(funnelCounts.receivedEmail)} · notif ${fmt(funnelCounts.receivedPush)}` : undefined}
                // Le prénom donné n'existe qu'en cumul (pas par cohorte) : affiché seulement sur « Depuis le début ».
                suffix={step.key === 'withChildren' && funnelWindow === 'all' ? `(dont ${fmt(profile.withChildFirstName)} avec prénom)` : undefined}
              />
            ))}
            <div style={{ ...muted, fontSize: '11px', marginTop: '8px' }}>
              Familles inscrites sur la période choisie ; chaque étape est incluse dans la précédente.
              À droite : part restante par rapport à l’étape d’avant, puis part du total des inscrits.
              Flèche : la plus grosse perte en proportion de l’étape d’avant. Envoi activé = ≥ 1 enfant + zone + email ou notif activé.
              « Actif » se mesure toujours sur les 30 derniers jours, quelle que soit la période d’inscription ;
              les détails email et notif peuvent se recouper.
            </div>
          </>
        ) : (
          <div style={{ ...muted, textAlign: 'center', padding: '12px 0' }}>Entonnoir indisponible pour cette période.</div>
        )}
      </div>

      <div style={sectionTitle}>Est-ce que ça sert ? ✦</div>
      <div style={card}>
        <Row cols="minmax(0, 1fr) 90px 90px" header cells={['', 'avec', 'sans']} />
        {segments.map((s) => {
          const seg = data.retentionBySegment?.[s.key] ?? EMPTY_SEGMENT;
          const withPct = pct(seg.with.active, seg.with.users);
          const withoutPct = pct(seg.without.active, seg.without.users);
          return (
            <Row
              key={s.key}
              cols="minmax(0, 1fr) 90px 90px"
              cells={[
                s.label,
                <SegmentValue key="w" value={withPct} users={seg.with.users} strong={withPct > withoutPct} />,
                <SegmentValue key="wo" value={withoutPct} users={seg.without.users} />,
              ]}
            />
          );
        })}
        <div style={{ ...muted, fontSize: '11px', marginTop: '8px' }}>
          % d'inscrits revenus sur ≥ 2 jours ces 30 derniers jours, par groupe (effectif entre parenthèses).
          Corrélation, pas causalité : les familles les plus motivées font aussi tout le reste.
        </div>
      </div>

      <div style={sectionTitle}>Assistant 🧸 <span style={muted}>· cumul depuis le 16/09, inscrits seulement</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        <Stat label="Ouvertures" value={fmt(assistant.opens)} sub={`${fmt(assistant.completions)} terminées`} />
        <Stat label="Utilisateurs" value={fmt(assistant.users)} sub={`${pct(assistant.users, registered)} % des inscrits`} />
        <Stat label="Taux de complétion" value={`${pct(assistant.completions, assistant.opens)} %`} sub="terminées / ouvertes" />
      </div>

      <div style={sectionTitle}>Envois 📬 <span style={muted}>· 30 derniers jours</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        <div style={card}>
          <div style={cardTitle}>Abonnés à la sélection hebdo</div>
          <KV k="✉️ Par email" v={fmt(profile.digestEmail)} first />
          <KV k="🔔 Par notification" v={fmt(profile.digestPush)} />
          <KV k="📱 Comptes avec appareil push" v={`🍎 ${fmt(pushDevices.ios)} · 🤖 ${fmt(pushDevices.android)}`} />
        </div>
        <div style={card}>
          <div style={cardTitle}>Sélection hebdo</div>
          <KV k="Emails envoyés" v={fmt(digest.emailSent)} first />
          <KV k="Notifications envoyées" v={fmt(digest.pushSent)} />
          <KV k="Échecs · supprimés" v={`${fmt(digest.emailFailed + digest.pushFailed)} · ${fmt(digest.emailSuppressed)}`} />
          <KV k="Rien à proposer" v={fmt(digest.skippedNoMatch)} />
        </div>
        <div style={card}>
          <div style={cardTitle}>Retours sur la sélection</div>
          <KV k="Réactions" v={`😍 ${feedback.reactions.love} · 😐 ${feedback.reactions.neutral} · 😕 ${feedback.reactions.sad}`} first />
          <KV k="Taux de réaction" v={`${pct(reactionsTotal, feedback.sends)} %`} />
          <KV k="Visites de /semaine" v={fmt(data.landingVisits30d.semaine)} />
          <KV k="Désabonnements" v={fmt(feedback.unsubscribes)} />
        </div>
        <div style={card}>
          <div style={cardTitle}>Alertes nouveaux lieux</div>
          <KV k="Emails envoyés" v={fmt(alerts.emailSent)} first />
          <KV k="Notifications envoyées" v={fmt(alerts.pushSent)} />
          <KV k="Échecs · supprimés" v={`${fmt(alerts.emailFailed + alerts.pushFailed)} · ${fmt(alerts.emailSuppressed)}`} />
          <KV k="Runs avortés" v={fmt(alerts.runAborted ?? 0)} warn={(alerts.runAborted ?? 0) > 0} />
          <KV k="Visites de /nouveaux-lieux" v={fmt(data.landingVisits30d.nouveauxLieux)} />
          <KV k="Désabonnements" v={fmt(data.alertUnsubscribes30d)} />
        </div>
      </div>
      <div style={{ ...muted, fontSize: '11px', marginTop: '8px' }}>
        Ni l'ouverture des emails ni le tap sur les notifications ne sont mesurés : les visites des pages
        d'atterrissage sont la seule trace d'un clic.
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={card}>
      <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'Fraunces', fontSize: '28px', fontWeight: 500, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={muted}>{sub}</div>
    </div>
  );
}

function Row({ cells, cols, header = false }: { cells: React.ReactNode[]; cols: string; header?: boolean }) {
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: cols, gap: '8px', alignItems: 'baseline', padding: '7px 0',
        borderTop: header ? 'none' : '1px solid var(--border)',
        fontFamily: 'DM Sans', fontSize: header ? '11px' : '13px', color: header ? 'var(--text-muted)' : 'var(--text)',
      }}
    >
      {cells.map((c, i) => <div key={i}>{c}</div>)}
    </div>
  );
}

function SegmentValue({ value, users, strong = false }: { value: number; users: number; strong?: boolean }) {
  return (
    <span>
      <span style={{ fontWeight: strong ? 700 : 500, color: strong ? '#3B7D6E' : 'var(--text)' }}>{value} %</span>{' '}
      <span style={{ ...muted, fontSize: '11px' }}>({fmt(users)})</span>
    </span>
  );
}

function WindowToggle({ value, onChange }: { value: FunnelWindow; onChange: (w: FunnelWindow) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={muted}>Inscrits sur</span>
      {FUNNEL_WINDOWS.map((w) => {
        const active = value === w.key;
        return (
          <button
            key={w.key}
            onClick={() => onChange(w.key)}
            aria-pressed={active}
            style={{
              padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
              border: active ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)',
              background: active ? 'var(--secondary)' : 'transparent',
              color: active ? 'white' : 'var(--text-muted)',
              fontFamily: 'DM Sans', cursor: 'pointer',
            }}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

function FunnelRow({ step, first, detail, suffix }: { step: FunnelStep; first: boolean; detail?: string; suffix?: string }) {
  // Barre centrée dont la largeur suit la part du total ; trop étroite, le nombre passe à côté.
  const width = step.value === 0 ? 0 : Math.max(step.ofTotal, 6);
  const inside = width >= 35;
  const count = <span style={{ fontSize: '13px', fontWeight: 600 }}>{fmt(step.value)}</span>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(84px, 120px) minmax(0, 1fr) minmax(70px, 96px)', alignItems: 'center', gap: '8px', marginBottom: '6px', fontFamily: 'DM Sans', color: 'var(--text)' }}>
      <div style={{ fontSize: '13px' }}>
        {step.label}
        {(step.hint || detail) && <div style={{ ...muted, fontSize: '11px' }}>{detail ?? step.hint}</div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: `${width}%`, height: '30px', borderRadius: '4px', background: 'var(--secondary)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              transition: 'width 0.3s ease',
            }}
          >
            {inside && count}
          </div>
          {!inside && count}
        </div>
        {suffix && <div style={{ ...muted, fontSize: '11px', textAlign: 'center', marginTop: '2px' }}>{suffix}</div>}
      </div>
      <div style={{ fontSize: '12px', textAlign: 'right', color: step.biggestDrop ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step.biggestDrop ? 600 : 400 }}>
        {first ? '100 %' : <>{step.biggestDrop && '↓ '}{step.ofPrevious} % <span style={muted}>· {step.ofTotal} %</span></>}
      </div>
    </div>
  );
}

function KV({ k, v, first = false, warn = false }: { k: string; v: string; first?: boolean; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderTop: first ? 'none' : '1px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text)' }}>
      <span>{k}</span>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: warn ? 'var(--primary)' : undefined }}>{v}</span>
    </div>
  );
}
