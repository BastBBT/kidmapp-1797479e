import { Location, categoryIcons, categoryLabels } from '@/types/location';
import { Baby, UtensilsCrossed, TreePine } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface LocationCardProps {
  location: Location;
  index?: number;
}

const CriterionBadge = ({ available, icon, label }: { available: boolean; icon: React.ReactNode; label: string }) => (
  <div
    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      available
        ? 'bg-success/10 text-success'
        : 'bg-muted text-muted-foreground'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </div>
);

const LocationCard = ({ location, index = 0 }: LocationCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-card rounded-2xl overflow-hidden kid-shadow cursor-pointer hover:kid-shadow-lg transition-shadow"
      onClick={() => navigate(`/location/${location.id}`)}
    >
      <div className="flex gap-3 p-3">
        <img
          src={location.photo}
          alt={location.name}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{categoryIcons[location.category]}</span>
            <span className="text-xs text-muted-foreground font-medium">
              {categoryLabels[location.category]}
            </span>
          </div>
          <h3 className="font-bold text-sm truncate text-foreground">{location.name}</h3>
          {location.address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{location.address}</p>
          )}
          <div className="flex gap-1.5 mt-2">
            <CriterionBadge
              available={location.highChair}
              icon={<UtensilsCrossed className="w-3 h-3" />}
              label="Chaise"
            />
            <CriterionBadge
              available={location.changingTable}
              icon={<Baby className="w-3 h-3" />}
              label="Change"
            />
            <CriterionBadge
              available={location.kidsArea}
              icon={<TreePine className="w-3 h-3" />}
              label="Jeux"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LocationCard;
