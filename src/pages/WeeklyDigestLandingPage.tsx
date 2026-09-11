import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { localeOf } from '@/lib/formatDate';

interface DigestItem {
  emoji: string;
  name: string;
  dateLabel: string;
  address: string | null;
  url: string;
}

interface ViewResponse {
  sendDate: string;
  childrenNames: string[];
  items: DigestItem[];
  reaction: 'love' | 'neutral' | 'sad' | null;
  unsubscribed: boolean;
}

type PageState =
  | { status: 'loading' }
  | { status: 'expired' }
  | { status: 'error' }
  | { status: 'ready'; data: ViewResponse };

type ReactionKey = 'love' | 'neutral' | 'sad';

const REACTIONS: { key: ReactionKey; emoji: string }[] = [
  { key: 'love', emoji: '😍' },
  { key: 'neutral', emoji: '😐' },
  { key: 'sad', emoji: '🙁' },
];

/**
 * Le verdict cliqué dans le mail arrive en `?r=`. On le pré-sélectionne, on ne
 * l'enregistre jamais tout seul : un antivirus de messagerie qui précharge le
 * lien voterait sinon à la place du parent. C'est aussi ce qui protège du tap
 * accidentel — le serveur refuse d'écraser une réaction déjà posée, donc un
 * clic direct était définitif.
 */
function suggestedReaction(raw: string | null): ReactionKey | null {
  return REACTIONS.some((r) => r.key === raw) ? (raw as ReactionKey) : null;
}

function greetingNames(names: string[], t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (names.length === 0) return t('weekly_digest.title_generic');
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
  return t('weekly_digest.title_named', { names: joined });
}

function dateRangeParts(sendDateISO: string, locale: string): { start: string; end: string } {
  const start = new Date(sendDateISO + 'T00:00:00Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = new Intl.DateTimeFormat(localeOf(locale), { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return { start: fmt.format(start), end: fmt.format(end) };
}

const WeeklyDigestLandingPage = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [selected, setSelected] = useState<ReactionKey | null>(() => suggestedReaction(searchParams.get('r')));
  const [reacting, setReacting] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [actionError, setActionError] = useState(false);

  useNoIndex();

  useEffect(() => {
    if (!token) {
      setState({ status: 'error' });
      return;
    }
    supabase.functions
      .invoke('digest-landing', { body: { token, action: 'view' } })
      .then(({ data, error }) => {
        if (error || data?.error === 'expired') {
          setState({ status: data?.error === 'expired' ? 'expired' : 'error' });
          return;
        }
        setState({ status: 'ready', data: data as ViewResponse });
      })
      .catch(() => setState({ status: 'error' }));
  }, [token]);

  const react = async (reaction: ReactionKey) => {
    if (state.status !== 'ready' || reacting || state.data.reaction) return;
    setReacting(true);
    setActionError(false);
    const { data, error } = await supabase.functions.invoke('digest-landing', {
      body: { token, action: 'react', reaction },
    });
    // Ne jamais afficher un état "enregistré" que le serveur n'a pas confirmé
    // — sur une action de désabonnement/réaction, mentir sur le succès serait
    // pire que de ne rien afficher.
    if (error || !data?.reaction) {
      setActionError(true);
      setReacting(false);
      return;
    }
    setState((prev) =>
      prev.status === 'ready' ? { ...prev, data: { ...prev.data, reaction: data.reaction } } : prev,
    );
    setReacting(false);
  };

  const unsubscribe = async () => {
    if (state.status !== 'ready' || unsubscribing || state.data.unsubscribed) return;
    setUnsubscribing(true);
    setActionError(false);
    const { data, error } = await supabase.functions.invoke('digest-landing', {
      body: { token, action: 'unsubscribe' },
    });
    if (error || !data?.unsubscribed) {
      setActionError(true);
      setUnsubscribing(false);
      return;
    }
    setState((prev) => (prev.status === 'ready' ? { ...prev, data: { ...prev.data, unsubscribed: true } } : prev));
    setUnsubscribing(false);
  };

  if (state.status === 'loading') {
    return <Shell><p style={sub}>{t('common.loading')}</p></Shell>;
  }

  if (state.status === 'expired') {
    return (
      <Shell>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
        <h1 style={title}>{t('weekly_digest.expired_title')}</h1>
        <p style={sub}>{t('weekly_digest.expired_message')}</p>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <h1 style={title}>{t('weekly_digest.not_found_title')}</h1>
      </Shell>
    );
  }

  const { data } = state;

  return (
    <Shell>
      <h1 style={title}>{greetingNames(data.childrenNames, t)}</h1>
      <p style={sub}>{t('weekly_digest.subtitle_range', dateRangeParts(data.sendDate, i18n.language))}</p>

      <div style={{ marginTop: 24 }}>
        {data.items.map((item, idx) => (
          // Même patron que la page « nouveaux lieux » : la carte entière ouvre
          // la fiche de la sortie, et l'app la récupère si elle est installée.
          <a key={idx} href={item.url} style={card}>
            <div style={cardEmoji}>{item.emoji}</div>
            <div>
              <div style={cardTitle}>{item.name}</div>
              <div style={cardMeta}>
                {item.dateLabel}
                {item.address ? ` · ${item.address}` : ''}
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={feedbackBox}>
        {data.reaction ? (
          <>
            <div style={feedbackQ}>{t('weekly_digest.feedback_thanks')}</div>
            <div style={confirmPill}>
              ✓ {t('weekly_digest.feedback_recorded')} : {REACTIONS.find((r) => r.key === data.reaction)?.emoji}
            </div>
          </>
        ) : (
          <>
            <div style={feedbackQ}>{t('weekly_digest.feedback_question')}</div>
            <div>
              {REACTIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setSelected(r.key)}
                  aria-pressed={selected === r.key}
                  disabled={reacting}
                  style={selected === r.key ? emojiButtonSelected : emojiButton}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => selected && react(selected)}
              disabled={!selected || reacting}
              style={selected ? confirmButton : confirmButtonDisabled}
            >
              {t('weekly_digest.feedback_confirm')}
            </button>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        {data.unsubscribed ? (
          <div style={{ ...confirmPill, backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            ✓ {t('weekly_digest.unsubscribe_confirmed')}
          </div>
        ) : (
          <button onClick={unsubscribe} disabled={unsubscribing} style={unsubButton}>
            {t('weekly_digest.unsubscribe_button')}
          </button>
        )}
      </div>

      {actionError ? <p style={{ ...sub, color: 'var(--destructive, #DC2626)', marginTop: 12 }}>{t('common.error')}</p> : null}
    </Shell>
  );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div style={page}>
    <div style={header}>kidmapp</div>
    <div style={content}>{children}</div>
  </div>
);

const page: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--bg)',
  fontFamily: "'DM Sans', sans-serif",
};
const header: React.CSSProperties = {
  textAlign: 'center',
  padding: '28px 0 8px',
  fontFamily: "'Fraunces', serif",
  fontWeight: 600,
  color: 'var(--primary)',
  fontSize: 20,
};
const content: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  padding: '16px 20px 60px',
  textAlign: 'center',
};
const title: React.CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontWeight: 600,
  fontSize: 20,
  color: 'var(--text)',
  margin: '14px 0 4px',
};
const sub: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 13,
  margin: 0,
};
const card: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  backgroundColor: 'var(--surface)',
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
  textAlign: 'left',
  boxShadow: 'var(--shadow)',
  textDecoration: 'none',
};
const cardEmoji: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  backgroundColor: 'var(--secondary-light)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  flexShrink: 0,
};
const cardTitle: React.CSSProperties = { fontWeight: 600, fontSize: 14, color: 'var(--text)' };
const cardMeta: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 };
const feedbackBox: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 14,
  padding: 20,
  textAlign: 'center',
  marginTop: 24,
  boxShadow: 'var(--shadow)',
};
const feedbackQ: React.CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontWeight: 600,
  fontSize: 15,
  marginBottom: 14,
  color: 'var(--text)',
};
const emojiButton: React.CSSProperties = {
  fontSize: 30,
  background: 'none',
  border: '2px solid transparent',
  cursor: 'pointer',
  margin: '0 8px',
  padding: 8,
  borderRadius: 12,
};
// La sélection doit se voir sans dépendre de la seule couleur : cadre + fond.
const emojiButtonSelected: React.CSSProperties = {
  ...emojiButton,
  backgroundColor: 'var(--secondary-light)',
  border: '2px solid var(--secondary)',
};
const confirmButton: React.CSSProperties = {
  marginTop: 16,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  color: '#fff',
  backgroundColor: 'var(--secondary)',
  border: 'none',
  borderRadius: 999,
  padding: '11px 26px',
  cursor: 'pointer',
};
const confirmButtonDisabled: React.CSSProperties = {
  ...confirmButton,
  backgroundColor: 'var(--border)',
  color: 'var(--text-muted)',
  cursor: 'default',
};
const confirmPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  backgroundColor: 'var(--secondary-light)',
  color: 'var(--secondary)',
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 999,
};
const unsubButton: React.CSSProperties = {
  fontSize: 12.5,
  color: 'var(--text-muted)',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '8px 16px',
  cursor: 'pointer',
};

export default WeeklyDigestLandingPage;
