import { useFavorites } from '@/hooks/useFavorites';
import { useLocations } from '@/hooks/useLocations';
import LocationCard from '@/components/LocationCard';
import Header from '@/components/Header';

const SavedPage = () => {
  const { favoriteIds } = useFavorites();
  const { data: locations = [] } = useLocations();
  const saved = locations.filter(l => favoriteIds.includes(l.id));

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <Header />
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Sauvegardés
        </h1>
        <p className="font-hand text-base mt-1" style={{ color: 'var(--text-muted)' }}>
          {saved.length} lieu{saved.length !== 1 ? 'x' : ''} ♥
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <div className="text-5xl mb-4">♡</div>
          <p className="font-display text-lg font-medium mb-1" style={{ color: 'var(--text)' }}>
            Aucun favori pour l'instant
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            Appuyez sur ♥ sur une fiche lieu pour sauvegarder
          </p>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3 pb-6">
          {saved.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedPage;
