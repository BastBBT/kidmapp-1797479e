import { Location, categoryIcons, categoryLabels } from '@/types/location';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { MEAL_ICONS, EQUIP_ICONS, EQUIP_SHORT_LABELS, EquipKey } from '@/assets/icons';

interface LocationCardProps {
  location: Location;
  index?: number;
  mealEmojis?: string[]; // legacy, kept for compatibility
  mealIds?: string[];
}

const categoryGradients: Record<string, string> = {
  restaurant: 'linear-gradient(145deg, #F5C0A8, #D9805E)',
  cafe: 'linear-gradient(145deg, #A8D4CE, #5FA89D)',
  public: 'linear-gradient(145deg, #B8D9A4, #72B05E)',
  shop: 'linear-gradient(145deg, #F5E0A0, #E0B848)',
  coiffeur: 'linear-gradient(145deg, #D7BDE2, #9B59B6)',
};

const EquipIcon = ({ equipKey }: { equipKey: EquipKey }) => (
  <span
    title={EQUIP_SHORT_LABELS[equipKey]}
    style={{
      width: 24, height: 24, borderRadius: 6, padding: 4,
      background: '#EBF4F2', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}
  >
    <img src={EQUIP_ICONS[equipKey]} alt={EQUIP_SHORT_LABELS[equipKey]} style={{ width: 16, height: 16, objectFit: 'contain' }} />
  </span>
);

const MealBubble = ({ mealId }: { mealId: string }) => {
  const src = MEAL_ICONS[mealId];
  if (!src) return null;
  return (
    <span
      style={{
        width: 21, height: 21, borderRadius: '50%', padding: 4,
        background: 'rgba(255,255,255,0.9)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}
    >
      <img src={src} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
    </span>
  );
};

const LocationCard = ({ location, index = 0, mealIds = [] }: LocationCardProps) => {
  const navigate = useNavigate();
  const { isFavorite } = useFavorites();
  const gradient = categoryGradients[location.category] || categoryGradients.public;
  const isMealCategory = location.category === 'restaurant' || location.category === 'cafe';

  const activeEquip: EquipKey[] = [];
  if (location.high_chair) activeEquip.push('high_chair');
  if (location.changing_table) activeEquip.push('changing_table');
  if (location.kids_area) activeEquip.push('kids_area');
  if ((location as any).kids_menu) activeEquip.push('kids_menu');

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
        {/* Meal bubbles bottom-left for restaurant/cafe */}
        {isMealCategory && mealIds.length > 0 && (
          <div className="absolute" style={{ bottom: 6, left: 6, display: 'flex', gap: 3 }}>
            {mealIds.slice(0, 4).map((id) => (
              <MealBubble key={id} mealId={id} />
            ))}
          </div>
        )}
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
        {activeEquip.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {activeEquip.map((k) => <EquipIcon key={k} equipKey={k} />)}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LocationCard;
