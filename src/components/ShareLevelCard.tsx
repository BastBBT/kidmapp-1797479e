import { forwardRef } from 'react';

export type ShareLevel = {
  id: number;
  name: string;
  color: string;
  bgFrom: string;
  bgTo: string;
  img: string;
};

interface ShareLevelCardProps {
  level: ShareLevel;
  points: number;
}

const ShareLevelCard = forwardRef<HTMLDivElement, ShareLevelCardProps>(
  ({ level, points }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 300,
          height: 300,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${level.bgFrom} 0%, ${level.bgTo} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 20px 16px',
          fontFamily: 'DM Sans',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}>
          <img
            src={level.img}
            alt={level.name}
            width={130}
            height={130}
            crossOrigin="anonymous"
            style={{ width: 130, height: 130, objectFit: 'contain' }}
          />
          <div style={{
            fontFamily: 'Fraunces',
            fontSize: 22,
            fontWeight: 700,
            color: '#1F1B16',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            textAlign: 'center',
          }}>
            {level.name}
          </div>
          <div style={{
            fontFamily: 'DM Sans',
            fontSize: 15,
            fontWeight: 600,
            color: level.color,
          }}>
            {points} {points <= 1 ? 'point' : 'points'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 11,
          color: 'rgba(0,0,0,0.5)',
          fontWeight: 500,
        }}>
          <span style={{ fontSize: 14 }}>🐘</span>
          <span>kidmapp.app</span>
        </div>
      </div>
    );
  }
);

ShareLevelCard.displayName = 'ShareLevelCard';

export default ShareLevelCard;
