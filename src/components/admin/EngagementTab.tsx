import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

/** Forme renvoyée par la RPC `admin_engagement_stats` (supabase/migrations/20260924210800). */
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
  const reactionsTotal = feedback.reactions.love + feedback.reactions.neutral + feedback.reactions.sad;
  const segments: { key: keyof EngagementStats['retentionBySegment']; label: string }[] = [
    { key: 'assistantCompleted', label: '🧸 A terminé l’assistant' },
    { key: 'hasChildren', label: '👶 A renseigné ≥ 1 enfant' },
    { key: 'digestEnabled', label: '📬 Reçoit la sélection hebdo' },
  ];

  return (
    <div>
      <div style={{ ...sectionTitle, marginTop: 0 }}>Est-ce que ça sert ? ✦</div>
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

      <div style={sectionTitle}>Profil famille 👶</div>
      <div style={card}>
        <div style={cardTitle}>Complétion — % des {fmt(registered)} inscrits</div>
        <Funnel label="≥ 1 enfant renseigné" value={profile.withChildren} total={registered} />
        <Funnel label="dont prénom donné" value={profile.withChildFirstName} total={registered} faded />
        <Funnel label="Zone déclarée" value={profile.withZone} total={registered} />
        <Funnel label="Sélection par email" value={profile.digestEmail} total={registered} />
        <Funnel label="Sélection par notif" value={profile.digestPush} total={registered} />
        <Funnel label="Profil complet" value={profile.complete} total={registered} color="#3B7D6E" />
        <div style={{ ...muted, fontSize: '11px', marginTop: '8px' }}>
          Profil complet = ≥ 1 enfant + zone + un envoi activé.
          {profile.withChildren > 0 && ` ${(profile.childrenTotal / profile.withChildren).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} enfant(s) en moyenne par famille renseignée.`}
        </div>
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

function Funnel({ label, value, total, faded = false, color = 'var(--primary)', hint }: {
  label: string; value: number; total: number; faded?: boolean; color?: string; hint?: string;
}) {
  const p = pct(value, total);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) 90px', alignItems: 'center', gap: '8px', marginBottom: '6px', fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text)' }}>
      <span style={{ paddingLeft: faded ? '12px' : 0 }}>{label}{hint && <span style={muted}> ({hint})</span>}</span>
      <div style={{ height: '12px', borderRadius: '4px', background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, opacity: faded ? 0.6 : 1, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ textAlign: 'right' }}>{p} % <span style={muted}>({fmt(value)})</span></span>
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
