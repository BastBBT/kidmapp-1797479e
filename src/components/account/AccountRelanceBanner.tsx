import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { isRelanceSnoozed, snoozeRelance } from '@/lib/childrenStorage';
import { pendingRelanceKind } from '@/lib/relance';

interface Props {
  onOpenZone: () => void;
  onOpenDigest: () => void;
}

/**
 * Écran 10 — bannière de relance zone/canal.
 *
 * Une seule relance à la fois, la zone d'abord : sans elle, un canal choisi
 * n'a rien de plus proche à proposer. Ne se propose qu'à un compte qui a eu le
 * temps de vivre (30 j, même délai que le snooze du hook enfants) ; « Plus
 * tard » la tait 30 jours de plus, jamais un mur. Disparaît d'elle-même dès
 * que la donnée est renseignée, sans attendre la fin du snooze.
 */
const AccountRelanceBanner = ({ onOpenZone, onOpenDigest }: Props) => {
  const { t } = useTranslation();
  const { settings } = useProfileSettings();
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const kind =
    dismissedThisSession || !settings
      ? null
      : pendingRelanceKind({
          createdAt: settings.createdAt,
          zoneCity: settings.zoneCity,
          digestEmailEnabled: settings.digestEmailEnabled,
          digestPushEnabled: settings.digestPushEnabled,
          snoozed: isRelanceSnoozed(),
        });

  if (!kind) return null;

  const isZone = kind === 'zone';

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)' }}>
        <span style={{ fontSize: 20, lineHeight: 1.2 }}>{isZone ? '📍' : '🔔'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {t(isZone ? 'account.relance_zone_title' : 'account.relance_channel_title')}
          </div>
          <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
            {t(isZone ? 'account.relance_zone_desc' : 'account.relance_channel_desc')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
            <button
              onClick={() => (isZone ? onOpenZone() : onOpenDigest())}
              style={{
                padding: '6px 14px', borderRadius: 100, border: 'none',
                background: 'var(--primary)', color: '#fff',
                fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t(isZone ? 'account.relance_zone_cta' : 'account.relance_channel_cta')}
            </button>
            <button
              onClick={() => {
                snoozeRelance();
                setDismissedThisSession(true);
              }}
              style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)',
              }}
            >
              {t('children.capture_later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountRelanceBanner;
