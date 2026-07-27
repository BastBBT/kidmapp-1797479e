import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import iconAsset from '@/assets/ios-app-icon.png.asset.json';

const STORAGE_KEY = 'kidmapp_iosBannerDismissedAt';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const APP_STORE_URL = 'https://apps.apple.com/fr/app/kidmapp/id6763571262';

const isIphone = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPhone only — iPad excluded on purpose
  return /iPhone/i.test(ua) && !/iPad/i.test(ua);
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  // iOS Safari sets navigator.standalone when added to home screen
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  if (navStandalone) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
};

const isDismissed = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

const IosAppBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIphone() && !isStandalone() && !isDismissed()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--primary-light)',
        borderBottom: '1px solid var(--border)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      }}
    >
      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 20,
          lineHeight: 1,
          padding: 4,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ×
      </button>

      <img
        src={iconAsset.url}
        alt="Kidmapp"
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      />

      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        <div
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
          }}
        >
          Kidmapp
        </div>
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {t('ios_banner.subtitle')}
        </div>
      </div>

      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderRadius: 100,
          background: 'var(--primary)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {t('ios_banner.open')}
      </a>
    </div>
  );
};

export default IosAppBanner;
