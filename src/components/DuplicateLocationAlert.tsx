import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabaseResized } from '@/lib/imageUrl';
import type { DuplicateMatch } from '@/lib/duplicateLocation';

interface DuplicateLocationAlertProps {
  matches: DuplicateMatch[];
  isActivity: boolean;
  onDismiss: () => void;
}

/**
 * « Donner mon avis » : seulement quand c'est bien ce lieu-là (nom ET adresse, ou même adresse). Un nom
 * proche à une autre adresse peut être une autre enseigne de la chaîne.
 */
const canContribute = (m: DuplicateMatch): boolean => m.level === 'strong' || m.sameAddress;

/**
 * Alerte « existe peut-être déjà » du formulaire de proposition : carte jaune quand le nom ET l'adresse
 * concordent, simple rappel gris sinon. Elle n'empêche jamais l'envoi. La fiche s'ouvre dans un nouvel
 * onglet : ce qui est déjà saisi dans le formulaire n'est pas perdu.
 */
export default function DuplicateLocationAlert({ matches, isActivity, onDismiss }: DuplicateLocationAlertProps) {
  const { t } = useTranslation();
  if (matches.length === 0) return null;
  const strong = matches[0].level === 'strong';
  const title = strong
    ? isActivity ? t('duplicate_location.title_activity') : t('duplicate_location.title_place')
    : matches[0].sameAddress ? t('duplicate_location.title_same_address') : t('duplicate_location.title_similar_name');
  const thumb = strong ? 52 : 36;

  return (
    <div
      role="status"
      style={{
        background: strong ? '#FEF9E7' : '#F3F1EC',
        border: strong ? '1px solid #EBD58A' : '1px solid transparent',
        borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: strong ? '#8A6A00' : 'var(--text-muted)' }}>
        {strong && <AlertTriangle size={16} aria-hidden />}
        {title}
      </div>
      {matches.map((m) => (
        <div key={m.candidate.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <a
          href={`/location/${m.candidate.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: 8, textDecoration: 'none',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          }}
        >
          <span style={{ width: thumb, height: thumb, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: 'var(--primary-light)' }}>
            {m.candidate.photo && (
              <img
                src={supabaseResized(m.candidate.photo, { width: 120, height: 120, quality: 70 })}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </span>
          <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.candidate.name}</span>
            {m.candidate.address && (
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{m.candidate.address}</span>
            )}
            {strong && (
              <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                {[t('duplicate_location.chip_same_address'), t('duplicate_location.chip_similar_name')].map((label) => (
                  <span key={label} style={{ fontFamily: 'DM Sans', fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: 'var(--secondary-light, #EBF4F2)', color: 'var(--secondary)' }}>
                    {label}
                  </span>
                ))}
              </span>
            )}
          </span>
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
            {t('duplicate_location.view')}
          </span>
        </a>
        {canContribute(m) && (
          <a
            href={`/location/${m.candidate.id}?contribuer=1`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '10px 14px', borderRadius: 100, textDecoration: 'none',
              background: 'var(--primary)', color: '#fff', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
            }}
          >
            {t('duplicate_location.give_feedback')}
          </a>
        )}
        </div>
      ))}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          alignSelf: strong ? 'center' : 'flex-start', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
          fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        {t('duplicate_location.not_the_same')}
      </button>
    </div>
  );
}
