import { useState } from 'react';
import { ChevronDown, Share2 } from 'lucide-react';
import niv1Asset from '@/assets/levels/niv1.png.asset.json';
import niv2Asset from '@/assets/levels/niv2.png.asset.json';
import niv3Asset from '@/assets/levels/niv3.png.asset.json';
import niv4Asset from '@/assets/levels/niv4.png.asset.json';
import ShareLevelModal from './ShareLevelModal';

type Level = {
  id: number;
  name: string;
  min: number;
  max: number;
  color: string;
  bgFrom: string;
  bgTo: string;
  img: string;
};

const LEVELS: Level[] = [
  { id: 1, name: 'Explorateur',   min: 0,   max: 24,  color: '#A8A29E', bgFrom: '#FAF9F6', bgTo: '#F5F0EC', img: niv1Asset.url },
  { id: 2, name: 'Contributeur',  min: 25,  max: 74,  color: '#D95F3B', bgFrom: '#FFF8F5', bgTo: '#FFF0E8', img: niv2Asset.url },
  { id: 3, name: 'Guide Kidmapp', min: 75,  max: 149, color: '#3B7D6E', bgFrom: '#F0FAF7', bgTo: '#E4F5F0', img: niv3Asset.url },
  { id: 4, name: 'Ambassadeur',   min: 150, max: 500, color: '#C4882A', bgFrom: '#FFFBF0', bgTo: '#FFF4D4', img: niv4Asset.url },
];

const getCurrentLevel = (points: number): Level =>
  [...LEVELS].reverse().find(l => points >= l.min) ?? LEVELS[0];

const getNextLevel = (points: number): Level | null =>
  LEVELS.find(l => l.min > points) ?? null;

const getProgressPercent = (points: number): number => {
  const current = getCurrentLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.min - current.min;
  const gained = points - current.min;
  return Math.max(0, Math.min(100, Math.round((gained / range) * 100)));
};

// hex (#RRGGBB) → rgba string with given alpha
const rgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const REWARDS: { amount: number; label: string }[] = [
  { amount: 10, label: 'Contribution validée' },
  { amount: 5,  label: 'Premier sur un lieu' },
  { amount: 25, label: 'Proposition approuvée' },
];

interface LevelCardProps {
  points: number;
}

const LevelCard = ({ points }: LevelCardProps) => {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const current = getCurrentLevel(points);
  const next = getNextLevel(points);
  const progress = getProgressPercent(points);
  const isMax = !next;

  const handleShare = () => setShareOpen(true);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${current.bgFrom} 0%, ${current.bgTo} 100%)`,
      border: `1.5px solid ${rgba(current.color, 0.12)}`,
      borderRadius: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      fontFamily: 'DM Sans',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 14, padding: 16, alignItems: 'center' }}>
        <img
          src={current.img}
          alt={current.name}
          width={62}
          height={62}
          loading="eager"
          style={{
            width: 62, height: 62, borderRadius: 14,
            objectFit: 'contain', flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500,
            color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.15,
          }}>
            {current.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {points} {points <= 1 ? 'point accumulé' : 'points accumulés'}
          </div>

          <div style={{
            marginTop: 10,
            height: 7, borderRadius: 20,
            background: rgba(current.color, 0.12),
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${current.color} 0%, ${rgba(current.color, 0.75)} 100%)`,
              borderRadius: 20,
              transition: 'width 0.4s ease',
            }} />
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 6, fontSize: 11, color: 'var(--text-muted)',
          }}>
            {isMax ? (
              <div style={{ width: '100%', textAlign: 'center', color: current.color, fontWeight: 600 }}>
                🏆 Niveau maximum atteint !
              </div>
            ) : points === 0 ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                +{(next?.min ?? 25) - points} pts pour devenir {next?.name}
              </div>
            ) : (
              <>
                <span>{current.min} pts</span>
                <span style={{ color: current.color, fontWeight: 600 }}>
                  +{next.min - points} pts → {next.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Frise niveaux */}
      <div style={{
        borderTop: `1px solid ${rgba(current.color, 0.1)}`,
        padding: '12px 10px',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
      }}>
        {LEVELS.map(lvl => {
          const isActive = lvl.id === current.id;
          const isPast = lvl.id < current.id;
          return (
            <div key={lvl.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '8px 4px',
              borderRadius: 12,
              background: isActive ? rgba(lvl.color, 0.12) : 'transparent',
              border: isActive ? `1.5px solid ${lvl.color}` : '1.5px solid transparent',
              transition: 'all 0.2s ease',
            }}>
              <img
                src={lvl.img}
                alt=""
                width={24}
                height={24}
                style={{
                  width: 24, height: 24, objectFit: 'contain',
                  opacity: isActive || isPast ? 1 : 0.45,
                  filter: isActive || isPast ? 'none' : 'grayscale(0.5)',
                }}
              />
              <div style={{
                fontSize: 10.5, fontWeight: 600,
                color: isActive ? lvl.color : 'var(--text)',
                textAlign: 'center', lineHeight: 1.2,
              }}>
                {lvl.name}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {lvl.min}+ pts
              </div>
            </div>
          );
        })}
      </div>

      {/* Accordéon */}
      <div style={{ borderTop: `1px solid ${rgba(current.color, 0.1)}` }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', padding: '12px 16px', background: 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)',
          }}
          aria-expanded={open}
        >
          <span>Comment gagner des points ?</span>
          <ChevronDown
            size={18}
            style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
        {open && (
          <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REWARDS.map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 54, padding: '3px 8px', borderRadius: 100,
                  background: rgba(current.color, 0.14),
                  color: current.color, fontSize: 11.5, fontWeight: 700,
                }}>
                  +{r.amount} pts
                </span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share */}
      <div style={{ borderTop: `1px solid ${rgba(current.color, 0.1)}` }}>
        <button
          type="button"
          onClick={handleShare}
          style={{
            width: '100%', padding: '12px 16px', background: 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)',
          }}
        >
          <Share2 size={15} />
          Partager mon niveau
        </button>
      </div>
    </div>
  );
};

export default LevelCard;
