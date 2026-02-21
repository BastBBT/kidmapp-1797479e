import { useParams, useNavigate } from 'react-router-dom';
import { mockLocations } from '@/data/mockLocations';
import { categoryIcons, categoryLabels } from '@/types/location';
import { ArrowLeft, Baby, UtensilsCrossed, TreePine, MapPin, MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import ContributionModal from '@/components/ContributionModal';
import { motion } from 'framer-motion';
import Header from '@/components/Header';

const CriterionRow = ({ available, icon, label }: { available: boolean; icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 py-3">
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        available ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
      }`}
    >
      {icon}
    </div>
    <div className="flex-1">
      <span className="font-semibold text-sm">{label}</span>
    </div>
    <span
      className={`text-xs font-bold px-3 py-1 rounded-full ${
        available
          ? 'bg-success/10 text-success'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {available ? 'Disponible' : 'Non disponible'}
    </span>
  </div>
);

const LocationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showContribution, setShowContribution] = useState(false);

  const location = mockLocations.find((l) => l.id === id);

  if (!location) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lieu introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={location.photo}
          alt={location.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center kid-shadow"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container px-4 -mt-8 relative z-10"
      >
        <div className="bg-card rounded-2xl p-5 kid-shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{categoryIcons[location.category]}</span>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {categoryLabels[location.category]}
            </span>
          </div>

          <h1 className="text-xl font-extrabold mb-1">{location.name}</h1>

          {location.address && (
            <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs">{location.address}</span>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <h2 className="text-sm font-bold mb-1">Équipements enfants</h2>
            <div className="divide-y divide-border">
              <CriterionRow
                available={location.highChair}
                icon={<UtensilsCrossed className="w-4 h-4" />}
                label="Chaise haute"
              />
              <CriterionRow
                available={location.changingTable}
                icon={<Baby className="w-4 h-4" />}
                label="Table à langer"
              />
              <CriterionRow
                available={location.kidsArea}
                icon={<TreePine className="w-4 h-4" />}
                label="Espace jeux enfants"
              />
            </div>
          </div>

          <button
            onClick={() => setShowContribution(true)}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-2xl font-bold text-sm"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Signaler une mise à jour
          </button>
        </div>
      </motion.div>

      <ContributionModal
        location={location}
        open={showContribution}
        onClose={() => setShowContribution(false)}
      />
    </div>
  );
};

export default LocationPage;
