import { useState, useMemo } from 'react';
import { mockLocations } from '@/data/mockLocations';
import { LocationCategory } from '@/types/location';
import MapView from '@/components/MapView';
import LocationCard from '@/components/LocationCard';
import CategoryFilter from '@/components/CategoryFilter';
import Header from '@/components/Header';
import { Map, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | 'all'>('all');
  const [view, setView] = useState<'map' | 'list'>('map');

  const publishedLocations = mockLocations.filter((l) => l.status === 'published');

  const filteredLocations = useMemo(() => {
    if (selectedCategory === 'all') return publishedLocations;
    return publishedLocations.filter((l) => l.category === selectedCategory);
  }, [selectedCategory, publishedLocations]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="container px-4 py-4 flex-1 flex flex-col gap-4">
        {/* Filters */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

        {/* View toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium">
            {filteredLocations.length} lieu{filteredLocations.length > 1 ? 'x' : ''} trouvé{filteredLocations.length > 1 ? 's' : ''}
          </p>
          <div className="flex bg-muted rounded-full p-0.5">
            <button
              onClick={() => setView('map')}
              className={`p-2 rounded-full transition-colors ${
                view === 'map' ? 'bg-card kid-shadow text-primary' : 'text-muted-foreground'
              }`}
            >
              <Map className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-full transition-colors ${
                view === 'list' ? 'bg-card kid-shadow text-primary' : 'text-muted-foreground'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-[400px] rounded-2xl overflow-hidden"
            >
              <MapView locations={filteredLocations} />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 pb-6"
            >
              {filteredLocations.map((loc, i) => (
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
