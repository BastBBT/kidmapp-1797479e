import { useState, useMemo } from 'react';
import { LocationCategory } from '@/types/location';
import MapView from '@/components/MapView';
import LocationCard from '@/components/LocationCard';
import CategoryFilter from '@/components/CategoryFilter';
import Header from '@/components/Header';
import { Map, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocations } from '@/hooks/useLocations';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | 'all'>('all');
  const [view, setView] = useState<'map' | 'list'>('map');
  const { data: locations = [], isLoading } = useLocations(selectedCategory);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="container px-4 py-4 flex-1 flex flex-col gap-4">
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium">
            {isLoading ? 'Chargement…' : `${locations.length} lieu${locations.length > 1 ? 'x' : ''} trouvé${locations.length > 1 ? 's' : ''}`}
          </p>
          <div className="flex bg-muted rounded-full p-0.5">
            <button onClick={() => setView('map')} className={`p-2 rounded-full transition-colors ${view === 'map' ? 'bg-card kid-shadow text-primary' : 'text-muted-foreground'}`}>
              <Map className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`p-2 rounded-full transition-colors ${view === 'list' ? 'bg-card kid-shadow text-primary' : 'text-muted-foreground'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div key="map" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 h-[60vh] min-h-[400px] rounded-2xl overflow-hidden">
              <MapView locations={locations} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 pb-6">
              {locations.map((loc, i) => (
                <LocationCard key={loc.id} location={loc} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
