import { Heart } from 'lucide-react';

const SavedPage = () => {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="px-5 pt-14 pb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Sauvegardés
        </h1>
        <p className="font-handwritten text-base mt-1" style={{ color: 'var(--text-muted)' }}>
          Vos lieux favoris
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--primary-light)' }}
        >
          <Heart className="w-7 h-7" style={{ color: 'var(--primary)' }} />
        </div>
        <p className="font-display text-lg font-medium mb-1" style={{ color: 'var(--text)' }}>
          Aucun lieu sauvegardé
        </p>
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          Explorez la carte et sauvegardez vos lieux préférés pour les retrouver ici.
        </p>
      </div>
    </div>
  );
};

export default SavedPage;
