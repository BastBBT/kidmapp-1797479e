import { useState, useEffect, useMemo } from 'react';
import { categoryLabels, categoryIcons } from '@/types/location';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useAllLocations, useContributions } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

type AdminTab = 'dashboard' | 'locations' | 'contributions' | 'add' | 'proposals';

const tabs: { key: AdminTab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'locations', label: 'Lieux' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'proposals', label: 'Propositions' },
  { key: 'add', label: 'Ajouter un lieu' },
];

const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  return dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

const AdminPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);

  const { data: locations = [] } = useAllLocations();
  const { data: contributions = [] } = useContributions();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const [locationsRes, contributionsRes, usersRes, dailyRes] = await Promise.all([
        supabase.from('locations').select('id, status'),
        supabase.from('contributions').select('id, created_at, status'),
        supabase.from('profiles').select('id, created_at').gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('contributions').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      return {
        totalLocations: locationsRes.data?.length ?? 0,
        publishedLocations: locationsRes.data?.filter((l) => l.status === 'published').length ?? 0,
        pendingLocations: locationsRes.data?.filter((l) => l.status === 'pending').length ?? 0,
        totalContributions: contributionsRes.data?.length ?? 0,
        pendingContributions: contributionsRes.data?.filter((c) => c.status === 'pending').length ?? 0,
        activeUsers30d: usersRes.data?.length ?? 0,
        contributionsLast7d: dailyRes.data ?? [],
      };
    },
  });

  // Chart data
  const chartData = useMemo(() => {
    const days = getLast7Days();
    const counts = days.map((day) => {
      const count = (stats?.contributionsLast7d ?? []).filter(
        (c: any) => c.created_at?.slice(0, 10) === day
      ).length;
      return { day, count, label: getDayLabel(day) };
    });
    const max = Math.max(...counts.map((c) => c.count), 1);
    return { counts, max };
  }, [stats?.contributionsLast7d]);

  // Add location form
  const [form, setForm] = useState({
    name: '',
    category: 'restaurant',
    address: '',
    high_chair: false,
    changing_table: false,
    kids_area: false,
    bookable: 'unknown',
    status: 'pending',
  });
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const encoded = encodeURIComponent(address + ', Nantes, France');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data.length === 0) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      return null;
    }
  };

  const updateForm = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const togglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'unpublished' : 'published';
    const { error } = await supabase.from('locations').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    toast({ title: 'Statut mis à jour ✓' });
  };

  const handleContribution = async (contrib: any, action: 'validated' | 'rejected') => {
    const { error } = await supabase.from('contributions').update({ status: action }).eq('id', contrib.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    if (action === 'validated') {
      const updateData: any = {};
      if (contrib.high_chair !== null) updateData.high_chair = contrib.high_chair;
      if (contrib.changing_table !== null) updateData.changing_table = contrib.changing_table;
      if (contrib.kids_area !== null) updateData.kids_area = contrib.kids_area;
      if (contrib.bookable !== null) updateData.bookable = contrib.bookable;
      if (Object.keys(updateData).length > 0) {
        await supabase.from('locations').update(updateData).eq('id', contrib.location_id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['contributions'] });
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    toast({ title: action === 'validated' ? 'Contribution validée ✓' : 'Contribution rejetée' });
  };

  const handleAddLocation = async () => {
    if (!form.name || !form.address) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    // Geocode address
    const coords = await geocodeAddress(form.address);
    if (!coords) {
      toast({ title: 'Adresse introuvable', description: 'Vérifiez l\'adresse saisie', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Upload photo if present
    let photoUrl: string | null = null;
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('location-photos')
        .upload(fileName, photoFile);
      if (uploadError) {
        toast({ title: 'Erreur upload photo', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('location-photos')
        .getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
    }

    const insertData: any = {
      name: form.name,
      category: form.category,
      address: form.address,
      lat: coords.lat,
      lng: coords.lng,
      photo: photoUrl,
      high_chair: form.high_chair,
      changing_table: form.changing_table,
      kids_area: form.kids_area,
      status: form.status,
    };
    if (form.category === 'restaurant' || form.category === 'cafe') {
      insertData.bookable = form.bookable;
    }
    const { error } = await supabase.from('locations').insert(insertData as any);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    toast({ title: 'Lieu ajouté ✓' });
    setForm({ name: '', category: 'restaurant', address: '', high_chair: false, changing_table: false, kids_area: false, bookable: 'unknown', status: 'pending' });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  if (authLoading) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 0' }}>
        <div style={{ fontFamily: 'Fraunces', fontSize: '24px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Administration
        </div>
        <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)' }}>kidmap — Nantes ✦</div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 16px 0', overflowX: 'auto', display: 'flex', gap: '8px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontFamily: 'DM Sans',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '100px',
              border: activeTab === tab.key ? 'none' : '1px solid var(--border)',
              background: activeTab === tab.key ? 'var(--primary)' : 'var(--bg)',
              color: activeTab === tab.key ? '#fff' : 'var(--text)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-32">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <StatCard label="Lieux publiés" value={stats?.publishedLocations ?? 0} sub={`/ ${stats?.totalLocations ?? 0} total`} />
              <StatCard label="En attente" value={stats?.pendingLocations ?? 0} sub="lieux à valider" />
              <StatCard label="Users actifs 30j" value={stats?.activeUsers30d ?? 0} sub="nouveaux inscrits" />
              <StatCard label="Contributions" value={stats?.pendingContributions ?? 0} sub="en attente" />
            </div>

            {/* Mini chart */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '12px' }}>
                Contributions — 7 derniers jours
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                {chartData.counts.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max((d.count / chartData.max) * 60, 4)}px`,
                        background: 'var(--primary)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontFamily: 'DM Sans', fontSize: '10px', color: 'var(--text-muted)' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Lieux */}
        {activeTab === 'locations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            {locations.map((loc, i) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '12px', boxShadow: 'var(--shadow)' }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={loc.photo ?? '/placeholder.svg'}
                    alt={loc.name}
                    style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, color: 'var(--text)' }} className="truncate">
                      {categoryIcons[loc.category as keyof typeof categoryIcons]} {loc.name}
                    </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }} className="truncate">
                      {loc.address ?? loc.city}
                    </div>
                    <StatusBadge status={loc.status} />
                  </div>
                  <button
                    onClick={() => togglePublish(loc.id, loc.status)}
                    style={{
                      fontFamily: 'DM Sans',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      borderRadius: '100px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      ...(loc.status === 'published'
                        ? { border: '1.5px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }
                        : { border: 'none', background: 'var(--primary)', color: '#fff' }),
                    }}
                  >
                    {loc.status === 'published' ? 'Masquer' : 'Publier'}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Contributions */}
        {activeTab === 'contributions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            {contributions.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                Aucune contribution
              </p>
            )}
            {contributions.map((contrib: any, i: number) => {
              const loc = locations.find((l) => l.id === contrib.location_id);
              return (
                <motion.div
                  key={contrib.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '14px', boxShadow: 'var(--shadow)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                      {loc?.name ?? 'Lieu inconnu'}
                    </div>
                    <StatusBadge status={contrib.status} />
                  </div>
                  <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '8px' }}>
                    {new Date(contrib.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </div>
                  <div className="flex gap-4 mb-3" style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {contrib.high_chair !== null && <span>🪑 Chaise haute {contrib.high_chair ? '✓' : '✗'}</span>}
                    {contrib.changing_table !== null && <span>👶 Table à langer {contrib.changing_table ? '✓' : '✗'}</span>}
                    {contrib.kids_area !== null && <span>🌳 Espace jeux {contrib.kids_area ? '✓' : '✗'}</span>}
                  </div>
                  {contrib.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleContribution(contrib, 'validated')}
                        style={{
                          flex: 1,
                          fontFamily: 'DM Sans',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '8px',
                          borderRadius: '100px',
                          border: 'none',
                          background: 'var(--secondary)',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Valider
                      </button>
                      <button
                        onClick={() => handleContribution(contrib, 'rejected')}
                        style={{
                          flex: 1,
                          fontFamily: 'DM Sans',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '8px',
                          borderRadius: '100px',
                          border: '1.5px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        ✗ Rejeter
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Proposals */}
        {activeTab === 'proposals' && (
          <ProposalsTab geocodeAddress={geocodeAddress} queryClient={queryClient} toast={toast} />
        )}

        {/* Add location */}
        {activeTab === 'add' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow)' }}>
              <div className="flex flex-col gap-4">
                <FormField label="Nom *" value={form.name} onChange={(v) => updateForm('name', v)} />
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Catégorie *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => updateForm('category', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      fontFamily: 'DM Sans',
                      fontSize: '14px',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  >
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="cafe">☕ Café</option>
                    <option value="shop">🛍️ Boutique</option>
                    <option value="public">🌳 Lieu public</option>
                  </select>
                </div>
                <FormField label="Adresse *" value={form.address} onChange={(v) => updateForm('address', v)} placeholder="12 Rue Crébillon, 44000 Nantes" />

                {/* Photo upload */}
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Photo
                  </label>
                  {photoPreview && (
                    <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>
                      <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'DM Sans' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {photoFile ? photoFile.name : 'Choisir une photo'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPhotoFile(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 mt-1">
                  <Toggle label="Chaise haute" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                  <Toggle label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                  <Toggle label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
                </div>

                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Statut initial
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => updateForm('status', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      fontFamily: 'DM Sans',
                      fontSize: '14px',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  >
                    <option value="pending">En attente</option>
                    <option value="published">Publié</option>
                  </select>
                </div>

                <button
                  onClick={handleAddLocation}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '100px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontFamily: 'DM Sans',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                    marginTop: '8px',
                  }}
                >
                  {submitting ? 'Ajout en cours…' : 'Ajouter le lieu'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

/* Sub-components */

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'Fraunces', fontSize: '32px', fontWeight: 500, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: '#EBF6EC', color: '#2E7D32', label: 'Publié' },
    pending: { bg: 'var(--accent-light)', color: '#C49A35', label: 'En attente' },
    validated: { bg: '#EBF6EC', color: '#2E7D32', label: 'Validée' },
    rejected: { bg: '#FDECEC', color: '#C62828', label: 'Rejetée' },
  };
  const s = styles[status] ?? { bg: 'var(--bg)', color: 'var(--text-muted)', label: 'Masqué' };
  return (
    <span
      style={{
        display: 'inline-block',
        marginTop: 4,
        padding: '2px 10px',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'DM Sans',
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        step={type === 'number' ? '0.0001' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          fontFamily: 'DM Sans',
          fontSize: '14px',
          color: 'var(--text)',
          outline: 'none',
        }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: '100px',
          border: 'none',
          background: checked ? 'var(--primary)' : 'var(--border)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 23 : 3,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}

function ProposalsTab({ geocodeAddress, queryClient, toast }: {
  geocodeAddress: (address: string) => Promise<{lat: number; lng: number} | null>;
  queryClient: any;
  toast: any;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data } = await supabase.from('location_proposals' as any).select('*').order('created_at', { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const handleApprove = async (proposal: any) => {
    setProcessingId(proposal.id);
    try {
      const coords = await geocodeAddress(proposal.address);
      if (!coords) {
        toast({ title: 'Adresse introuvable', description: 'Impossible de géocoder cette adresse.', variant: 'destructive' });
        return;
      }
      const { error: insertError } = await supabase.from('locations').insert({
        name: proposal.name,
        category: proposal.category,
        address: proposal.address,
        lat: coords.lat,
        lng: coords.lng,
        high_chair: proposal.high_chair ?? false,
        changing_table: proposal.changing_table ?? false,
        kids_area: proposal.kids_area ?? false,
        status: 'published',
      } as any);
      if (insertError) throw insertError;
      const { error: updateError } = await supabase.from('location_proposals' as any).update({ status: 'approved' }).eq('id', proposal.id);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['all-locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Proposition approuvée ✓', description: `${proposal.name} a été ajouté aux lieux.` });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proposal: any) => {
    setProcessingId(proposal.id);
    try {
      const { error } = await supabase.from('location_proposals' as any).update({ status: 'rejected' }).eq('id', proposal.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposition rejetée' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const categoryBadgeColors: Record<string, { bg: string; color: string }> = {
    restaurant: { bg: '#F5E0D0', color: '#A0522D' },
    cafe: { bg: '#D4EDDA', color: '#2E7D32' },
    shop: { bg: '#FFF3CD', color: '#856404' },
    public: { bg: '#D4EDDA', color: '#2E7D32' },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
      {proposals.length === 0 && (
        <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
          Aucune proposition
        </p>
      )}
      {proposals.map((proposal: any, i: number) => {
        const catStyle = categoryBadgeColors[proposal.category] ?? { bg: 'var(--bg)', color: 'var(--text-muted)' };
        const isProcessing = processingId === proposal.id;
        return (
          <motion.div
            key={proposal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '14px', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                  {proposal.name}
                </span>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '100px',
                  fontSize: '10px', fontWeight: 600, fontFamily: 'DM Sans',
                  background: catStyle.bg, color: catStyle.color,
                }}>
                  {categoryLabels[proposal.category as keyof typeof categoryLabels] ?? proposal.category}
                </span>
              </div>
              <StatusBadge status={proposal.status === 'approved' ? 'validated' : proposal.status} />
            </div>
            <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              📍 {proposal.address}
            </div>
            <div className="flex gap-3 mb-2" style={{ fontFamily: 'DM Sans', fontSize: '12px' }}>
              {proposal.high_chair && <span style={{ color: '#2E7D32' }}>🪑 Chaise haute</span>}
              {proposal.changing_table && <span style={{ color: '#2E7D32' }}>👶 Table à langer</span>}
              {proposal.kids_area && <span style={{ color: '#2E7D32' }}>🌳 Espace jeux</span>}
            </div>
            {proposal.note && (
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '6px' }}>
                "{proposal.note}"
              </div>
            )}
            <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {new Date(proposal.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {proposal.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(proposal)}
                  disabled={isProcessing}
                  style={{
                    flex: 1, fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                    padding: '8px', borderRadius: '100px', border: 'none',
                    background: 'var(--secondary)', color: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  {isProcessing ? 'En cours…' : '✓ Approuver'}
                </button>
                <button
                  onClick={() => handleReject(proposal)}
                  disabled={isProcessing}
                  style={{
                    flex: 1, fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                    padding: '8px', borderRadius: '100px',
                    border: '1.5px solid var(--border)', background: 'transparent',
                    color: 'var(--text-muted)', cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  ✗ Rejeter
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default AdminPage;
