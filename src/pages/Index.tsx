import { useState } from 'react';
import { LocationCategory } from '@/types/location';
import MapView from '@/components/MapView';
import LocationCard from '@/components/LocationCard';
import Header from '@/components/Header';
import { Map, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocations } from '@/hooks/useLocations';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const { data: locations = [], isLoading } = useLocations(selectedCategory);

  const filteredLocations = locations.filter(loc => {
    const matchCategory = !selectedCategory || selectedCategory === 'all' || loc.category === selectedCategory;
    const matchSearch = !searchQuery
      || loc.name.toLowerCase().includes(searchQuery.toLowerCase())
      || loc.address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--bg)' }}>
      <Header
        onSearch={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <div className="container px-4 py-4 flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? 'Chargement…' : `${filteredLocations.length} lieu${filteredLocations.length > 1 ? 'x' : ''} trouvé${filteredLocations.length > 1 ? 's' : ''}`}
          </p>
          <div className="flex p-0.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '100px' }}>
            <button
              onClick={() => setView('map')}
              className="p-2 transition-all"
              style={{
                borderRadius: '100px',
                background: view === 'map' ? 'var(--surface)' : 'transparent',
                boxShadow: view === 'map' ? 'var(--shadow)' : 'none',
                color: view === 'map' ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <Map className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className="p-2 transition-all"
              style={{
                borderRadius: '100px',
                background: view === 'list' ? 'var(--surface)' : 'transparent',
                boxShadow: view === 'list' ? 'var(--shadow)' : 'none',
                color: view === 'list' ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div key="map" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[55vh] min-h-[360px] overflow-hidden px-4" style={{ borderRadius: 'var(--radius)' }}>
              <MapView locations={filteredLocations} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3 pb-6">
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
