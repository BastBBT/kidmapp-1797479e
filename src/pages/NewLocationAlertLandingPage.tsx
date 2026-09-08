import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';

interface LocationItem {
  emoji: string;
  name: string;
  address: string | null;
  url: string;
}

interface ViewResponse {
  sendDate: string;
  items: LocationItem[];
  unsubscribed: boolean;
}

type PageState =
  | { status: 'loading' }
  | { status: 'expired' }
  | { status: 'error' }
  | { status: 'ready'; data: ViewResponse };

const NewLocationAlertLandingPage = () => {
  const { token } = useParams();
  const { t } = useTranslation();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [actionError, setActionError] = useState(false);

  useNoIndex();

  useEffect(() => {
    if (!token) {
      setState({ status: 'error' });
      return;
    }
    supabase.functions
      .invoke('location-alert-landing', { body: { token, action: 'view' } })
      .then(({ data, error }) => {
        if (error || data?.error === 'expired') {
          setState({ status: data?.error === 'expired' ? 'expired' : 'error' });
          return;
        }
        setState({ status: 'ready', data: data as ViewResponse });
      })
      .catch(() => setState({ status: 'error' }));
  }, [token]);

  const unsubscribe = async () => {
    if (state.status !== 'ready' || unsubscribing || state.data.unsubscribed) return;
    setUnsubscribing(true);
    setActionError(false);
    // Même garde que WeeklyDigestLandingPage : ne jamais afficher un état
    // "désabonné" que le serveur n'a pas confirmé.
    const { data, error } = await supabase.functions.invoke('location-alert-landing', {
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
        <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
        <h1 style={title}>{t('new_location_alert.expired_title')}</h1>
        <p style={sub}>{t('new_location_alert.expired_message')}</p>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <h1 style={title}>{t('new_location_alert.not_found_title')}</h1>
      </Shell>
    );
  }

  const { data } = state;

  return (
    <Shell>
      <h1 style={title}>{t('new_location_alert.title')}</h1>
      <p style={sub}>{t('new_location_alert.subtitle')}</p>

      <div style={{ marginTop: 24 }}>
        {data.items.map((item, idx) => (
          <a key={idx} href={item.url} style={card}>
            <div style={cardEmoji}>{item.emoji}</div>
            <div>
              <div style={cardTitle}>{item.name}</div>
              {item.address ? <div style={cardMeta}>{item.address}</div> : null}
            </div>
          </a>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        {data.unsubscribed ? (
          <div style={{ ...confirmPill, backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            ✓ {t('new_location_alert.unsubscribe_confirmed')}
          </div>
        ) : (
          <button onClick={unsubscribe} disabled={unsubscribing} style={unsubButton}>
            {t('new_location_alert.unsubscribe_button')}
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

export default NewLocationAlertLandingPage;
