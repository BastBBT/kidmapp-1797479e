import { useState } from 'react';
import { mockLocations, mockContributions } from '@/data/mockLocations';
import { Location, Contribution, categoryLabels, categoryIcons } from '@/types/location';
import { Baby, UtensilsCrossed, TreePine, Eye, EyeOff, Check, X, Pencil } from 'lucide-react';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const AdminPage = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>(mockLocations);
  const [contributions, setContributions] = useState<Contribution[]>(mockContributions);
  const [activeTab, setActiveTab] = useState<'locations' | 'contributions'>('locations');

  const togglePublish = (id: string) => {
    setLocations((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: l.status === 'published' ? 'unpublished' : 'published' }
          : l
      )
    );
    toast({ title: 'Statut mis à jour ✓' });
  };

  const handleContribution = (id: string, action: 'validated' | 'rejected') => {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: action } : c))
    );
    toast({
      title: action === 'validated' ? 'Contribution validée ✓' : 'Contribution rejetée',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-6">Administration</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'locations'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Lieux ({locations.length})
          </button>
          <button
            onClick={() => setActiveTab('contributions')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'contributions'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Contributions ({contributions.filter((c) => c.status === 'pending').length})
          </button>
        </div>

        {activeTab === 'locations' && (
          <div className="flex flex-col gap-3">
            {locations.map((loc, i) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 kid-shadow"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={loc.photo}
                    alt={loc.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{categoryIcons[loc.category]}</span>
                      <span className="text-xs text-muted-foreground">{categoryLabels[loc.category]}</span>
                    </div>
                    <h3 className="font-bold text-sm truncate">{loc.name}</h3>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        loc.status === 'published'
                          ? 'bg-success/10 text-success'
                          : loc.status === 'pending'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {loc.status === 'published' ? 'Publié' : loc.status === 'pending' ? 'En attente' : 'Masqué'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => togglePublish(loc.id)}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      title={loc.status === 'published' ? 'Masquer' : 'Publier'}
                    >
                      {loc.status === 'published' ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-success" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="flex flex-col gap-3">
            {contributions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucune contribution</p>
            )}
            {contributions.map((contrib, i) => {
              const loc = locations.find((l) => l.id === contrib.locationId);
              return (
                <motion.div
                  key={contrib.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 kid-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{loc?.name ?? 'Lieu inconnu'}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        contrib.status === 'pending'
                          ? 'bg-warning/10 text-warning'
                          : contrib.status === 'validated'
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {contrib.status === 'pending' ? 'En attente' : contrib.status === 'validated' ? 'Validée' : 'Rejetée'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                    {contrib.highChair !== null && (
                      <span className="flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3" />
                        {contrib.highChair ? '✓' : '✗'}
                      </span>
                    )}
                    {contrib.changingTable !== null && (
                      <span className="flex items-center gap-1">
                        <Baby className="w-3 h-3" />
                        {contrib.changingTable ? '✓' : '✗'}
                      </span>
                    )}
                    {contrib.kidsArea !== null && (
                      <span className="flex items-center gap-1">
                        <TreePine className="w-3 h-3" />
                        {contrib.kidsArea ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(contrib.timestamp).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {contrib.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleContribution(contrib.id, 'validated')}
                        className="flex-1 flex items-center justify-center gap-1 bg-success text-success-foreground py-2 rounded-xl text-xs font-bold"
                      >
                        <Check className="w-3 h-3" /> Valider
                      </button>
                      <button
                        onClick={() => handleContribution(contrib.id, 'rejected')}
                        className="flex-1 flex items-center justify-center gap-1 bg-destructive text-destructive-foreground py-2 rounded-xl text-xs font-bold"
                      >
                        <X className="w-3 h-3" /> Rejeter
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
