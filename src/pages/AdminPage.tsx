import { useState, useEffect } from 'react';
import { Location, categoryLabels, categoryIcons } from '@/types/location';
import { Baby, UtensilsCrossed, TreePine, Eye, EyeOff, Check, X } from 'lucide-react';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useAllLocations, useContributions } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);
  const { data: locations = [] } = useAllLocations();
  const { data: contributions = [] } = useContributions();
  const [activeTab, setActiveTab] = useState<'locations' | 'contributions'>('locations');

  const togglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'unpublished' : 'published';
    const { error } = await supabase.from('locations').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    toast({ title: 'Statut mis à jour ✓' });
  };

  const handleContribution = async (id: string, action: 'validated' | 'rejected') => {
    const { error } = await supabase.from('contributions').update({ status: action }).eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['contributions'] });
    toast({ title: action === 'validated' ? 'Contribution validée ✓' : 'Contribution rejetée' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-6">Administration</h1>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'locations' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Lieux ({locations.length})
          </button>
          <button onClick={() => setActiveTab('contributions')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'contributions' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Contributions ({contributions.filter((c) => c.status === 'pending').length})
          </button>
        </div>

        {activeTab === 'locations' && (
          <div className="flex flex-col gap-3">
            {locations.map((loc, i) => (
              <motion.div key={loc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card rounded-xl p-4 kid-shadow">
                <div className="flex items-start gap-3">
                  <img src={loc.photo ?? '/placeholder.svg'} alt={loc.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{categoryIcons[loc.category as keyof typeof categoryIcons]}</span>
                      <span className="text-xs text-muted-foreground">{categoryLabels[loc.category as keyof typeof categoryLabels]}</span>
                    </div>
                    <h3 className="font-bold text-sm truncate">{loc.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${loc.status === 'published' ? 'bg-success/10 text-success' : loc.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      {loc.status === 'published' ? 'Publié' : loc.status === 'pending' ? 'En attente' : 'Masqué'}
                    </span>
                  </div>
                  <button onClick={() => togglePublish(loc.id, loc.status)} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    {loc.status === 'published' ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-success" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="flex flex-col gap-3">
            {contributions.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune contribution</p>}
            {contributions.map((contrib, i) => {
              const loc = locations.find((l) => l.id === contrib.location_id);
              return (
                <motion.div key={contrib.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card rounded-xl p-4 kid-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{loc?.name ?? 'Lieu inconnu'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${contrib.status === 'pending' ? 'bg-warning/10 text-warning' : contrib.status === 'validated' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {contrib.status === 'pending' ? 'En attente' : contrib.status === 'validated' ? 'Validée' : 'Rejetée'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                    {contrib.high_chair !== null && <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" />{contrib.high_chair ? '✓' : '✗'}</span>}
                    {contrib.changing_table !== null && <span className="flex items-center gap-1"><Baby className="w-3 h-3" />{contrib.changing_table ? '✓' : '✗'}</span>}
                    {contrib.kids_area !== null && <span className="flex items-center gap-1"><TreePine className="w-3 h-3" />{contrib.kids_area ? '✓' : '✗'}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(contrib.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {contrib.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleContribution(contrib.id, 'validated')} className="flex-1 flex items-center justify-center gap-1 bg-success text-success-foreground py-2 rounded-xl text-xs font-bold">
                        <Check className="w-3 h-3" /> Valider
                      </button>
                      <button onClick={() => handleContribution(contrib.id, 'rejected')} className="flex-1 flex items-center justify-center gap-1 bg-destructive text-destructive-foreground py-2 rounded-xl text-xs font-bold">
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
