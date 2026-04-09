import { Location, categoryIcons, categoryLabels } from '@/types/location';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';

interface LocationCardProps {
  location: Location;
  index?: number;
}

const categoryGradients: Record<string, string> = {
  restaurant: 'linear-gradient(145deg, #F5C0A8, #D9805E)',
  cafe: 'linear-gradient(145deg, #A8D4CE, #5FA89D)',
  public: 'linear-gradient(145deg, #B8D9A4, #72B05E)',
  shop: 'linear-gradient(145deg, #F5E0A0, #E0B848)',
  coiffeur: 'linear-gradient(145deg, #D7BDE2, #9B59B6)',
};

const EquipBadge = ({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium"
    style={{
      borderRadius: '100px',
      background: active ? '#EBF6EC' : 'var(--bg)',
      color: active ? '#2E7D32' : 'var(--text-muted)',
      opacity: active ? 1 : 0.65,
    }}
  >
    {icon}
    {label}
  </span>
);

const HighChairIcon = () => (
  <svg width="12" height="12" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="11" y="4" width="14" height="10" rx="3"/><path d="M11 14 L8 26"/><path d="M25 14 L28 26"/><path d="M8 20 L28 20"/><path d="M14 26 L22 26"/>
  </svg>
);
const ChangingTableIcon = () => (
  <svg width="12" height="12" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="18" width="28" height="5" rx="2"/><path d="M7 18 L7 28"/><path d="M29 18 L29 28"/><circle cx="18" cy="11" r="4"/><path d="M14 15 Q18 21 22 15"/>
  </svg>
);
const KidsAreaIcon = () => (
  <svg width="12" height="12" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 28 L8 14 Q8 10 12 10 L24 10"/><path d="M8 28 L22 28"/><path d="M24 10 Q32 14 28 24 L22 28"/><circle cx="26" cy="26" r="3"/>
  </svg>
);

const LocationCard = ({ location, index = 0 }: LocationCardProps) => {
  const navigate = useNavigate();
  const { isFavorite } = useFavorites();
  const gradient = categoryGradients[location.category] || categoryGradients.public;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="overflow-hidden cursor-pointer"
      style={{
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow)',
      }}
      onClick={() => navigate(`/location/${location.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ height: '118px', background: gradient, overflow: 'hidden' }}>
        {location.photo ? (
          <img
            src={location.photo}
            alt={location.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute" style={{ width: 80, height: 80, top: 10, left: 15, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
            <div className="absolute" style={{ width: 50, height: 50, bottom: 8, right: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          </>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)' }} />
        {/* Category emoji */}
        <span className="absolute bottom-2 right-3 text-xl opacity-80">
          {categoryIcons[location.category as keyof typeof categoryIcons]}
        </span>
        {isFavorite(location.id) && (
          <span
            className="absolute top-2 left-2 font-hand text-xs px-2 py-0.5"
            style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '100px', color: 'var(--primary)' }}
          >
            Coup de ♥
          </span>
        )}
      </div>
      {/* Body */}
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
          {location.name}
        </h3>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <EquipBadge active={location.high_chair} label="Chaise" icon={<HighChairIcon />} />
          <EquipBadge active={location.changing_table} label="Change" icon={<ChangingTableIcon />} />
          <EquipBadge active={location.kids_area} label="Jeux" icon={<KidsAreaIcon />} />
        </div>
      </div>
    </motion.div>
  );
};

export default LocationCard;
