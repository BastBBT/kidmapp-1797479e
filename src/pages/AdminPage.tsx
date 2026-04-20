import { useState, useEffect, useMemo } from 'react';
import { categoryLabels, categoryIcons } from '@/types/location';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useAllLocations, useContributions } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useMealTypes, type MealType } from '@/hooks/useMeals';

type AdminTab = 'dashboard' | 'locations' | 'contributions' | 'add' | 'proposals';

type MealsState = Record<string, { enabled: boolean; time_open: string; time_close: string; confirmed_count: number }>;

const buildEmptyMealsState = (mealTypes: MealType[]): MealsState => {
  const s: MealsState = {};
  mealTypes.forEach((m) => {
    s[m.id] = { enabled: false, time_open: '', time_close: '', confirmed_count: 0 };
  });
  return s;
};

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

const normalize = (s?: string | null) =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const matchSearch = (q: string, ...fields: (string | undefined | null)[]) => {
  const nq = normalize(q).trim();
  if (!nq) return true;
  return fields.some((f) => normalize(f).includes(nq));
};

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative', marginBottom: '12px' }}>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px 10px 38px',
          borderRadius: '100px',
          border: '1.5px solid var(--border)',
          background: 'var(--surface)',
          fontFamily: 'DM Sans',
          fontSize: '14px',
          color: 'var(--text)',
          outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Effacer"
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '16px', padding: '4px 8px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

const AdminPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchLocations, setSearchLocations] = useState('');
  const [searchContributions, setSearchContributions] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);

  const { data: locations = [] } = useAllLocations();
  const { data: contributions = [] } = useContributions();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    enabled: isAdmin,
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
    website: '',
    instagram: '',
    note: '',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: mealTypes = [] } = useMealTypes();
  const [addMeals, setAddMeals] = useState<MealsState>({});
  const [editMeals, setEditMeals] = useState<MealsState>({});

  // Initialize add-form meals when meal types load
  useEffect(() => {
    if (mealTypes.length > 0 && Object.keys(addMeals).length === 0) {
      setAddMeals(buildEmptyMealsState(mealTypes));
    }
  }, [mealTypes, addMeals]);

  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState('47.2184');
  const [manualLng, setManualLng] = useState('-1.5536');

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    const cleaned = address
      .trim()
      .replace(/\brue\b/gi, 'rue')
      .replace(/\bav\b\.?/gi, 'avenue')
      .replace(/\bbd\b\.?/gi, 'boulevard')
      .replace(/\bpl\b\.?/gi, 'place');

    const queries = [
      `${cleaned}, Nantes, France`,
      `${cleaned}, 44000, France`,
      `${cleaned}, Loire-Atlantique, France`,
      cleaned,
    ];

    for (const query of queries) {
      try {
        const encoded = encodeURIComponent(query);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&countrycodes=fr&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'fr',
              'User-Agent': 'Kidmapp/1.0'
            }
          }
        );
        const data = await res.json();
        if (data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          if (lat >= 46.9 && lat <= 47.5 && lng >= -2.2 && lng <= -1.1) {
            return { lat, lng };
          }
          if (queries.indexOf(query) === queries.length - 1) {
            return { lat, lng };
          }
        }
      } catch {
        continue;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return null;
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

    let coords: { lat: number; lng: number } | null = null;

    if (showManualCoords) {
      coords = {
        lat: parseFloat(manualLat),
        lng: parseFloat(manualLng),
      };
    } else {
      coords = await geocodeAddress(form.address);
      if (!coords) {
        setShowManualCoords(true);
        toast({ title: 'Adresse non trouvée automatiquement', description: 'Ajustez les coordonnées manuellement.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
    }

    // Upload photo if present
    let photoUrl: string | null = null;
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `admin/${crypto.randomUUID()}.${fileExt}`;
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
      website: form.website || null,
      instagram: form.instagram || null,
      note: form.note || null,
    };
    if (form.category === 'restaurant' || form.category === 'cafe') {
      insertData.bookable = form.bookable;
    }
    const { data: insertedLocation, error } = await supabase
      .from('locations')
      .insert(insertData as any)
      .select('id')
      .single();
    if (error || !insertedLocation) {
      setSubmitting(false);
      toast({ title: 'Erreur', description: error?.message ?? 'Insertion échouée', variant: 'destructive' });
      return;
    }

    // Insert meals for new location
    const mealRows = Object.entries(addMeals)
      .filter(([, v]) => v.enabled)
      .map(([meal_type_id, v]) => {
        const mt = mealTypes.find((m) => m.id === meal_type_id);
        return {
          location_id: insertedLocation.id,
          meal_type_id,
          time_open: v.time_open || mt?.default_time_start || null,
          time_close: v.time_close || mt?.default_time_end || null,
          is_confirmed: true,
          confirmed_count: 0,
        };
      });
    if (mealRows.length > 0) {
      await supabase.from('location_meals').insert(mealRows);
    }

    setSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['location_meals'] });
    toast({ title: 'Lieu ajouté ✓' });
    setForm({ name: '', category: 'restaurant', address: '', high_chair: false, changing_table: false, kids_area: false, bookable: 'unknown', status: 'pending', website: '', instagram: '', note: '' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setAddMeals(buildEmptyMealsState(mealTypes));
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
        <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)' }}>kidmapp — Nantes ✦</div>
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
            <SearchBar
              value={searchLocations}
              onChange={setSearchLocations}
              placeholder="Rechercher par nom, adresse ou site web…"
            />
            {(() => {
              const filtered = locations.filter((loc) =>
                matchSearch(searchLocations, loc.name, loc.address, (loc as any).website)
              );
              return (
                <>
                  <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {filtered.length} {filtered.length > 1 ? 'lieux affichés' : 'lieu affiché'}
                  </div>
                  {filtered.length === 0 && (
                    <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                      Aucun résultat
                    </p>
                  )}
                  {filtered.map((loc, i) => (
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
                    <div className="flex gap-1 mt-1">
                      {(loc as any).website && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      )}
                      {(loc as any).instagram && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <button
                    onClick={() => togglePublish(loc.id, loc.status)}
                    style={{
                      padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                      border: loc.status === 'published' ? '1.5px solid var(--border)' : 'none',
                      background: loc.status === 'published' ? 'transparent' : 'var(--primary)',
                      color: loc.status === 'published' ? 'var(--text-muted)' : 'white',
                      fontFamily: 'DM Sans', cursor: 'pointer',
                    }}
                  >
                    {loc.status === 'published' ? 'Masquer' : 'Publier'}
                  </button>
                  <button
                    onClick={async () => {
                      setEditingId(loc.id);
                      setEditForm({
                        name: loc.name,
                        category: loc.category,
                        address: loc.address ?? '',
                        website: (loc as any).website ?? '',
                        instagram: (loc as any).instagram ?? '',
                        photo: loc.photo ?? '',
                        note: (loc as any).note ?? '',
                        high_chair: loc.high_chair,
                        changing_table: loc.changing_table,
                        kids_area: loc.kids_area,
                        bookable: (loc as any).bookable ?? 'unknown',
                        status: loc.status,
                      });
                      // Load existing meals for this location
                      const base = buildEmptyMealsState(mealTypes);
                      const { data: existing } = await supabase
                        .from('location_meals')
                        .select('*')
                        .eq('location_id', loc.id);
                      (existing ?? []).forEach((row: any) => {
                        if (base[row.meal_type_id]) {
                          base[row.meal_type_id] = {
                            enabled: true,
                            time_open: row.time_open ?? '',
                            time_close: row.time_close ?? '',
                            confirmed_count: row.confirmed_count ?? 0,
                          };
                        }
                      });
                      setEditMeals(base);
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                      border: '1.5px solid var(--secondary)', background: 'transparent',
                      color: 'var(--secondary)', fontFamily: 'DM Sans', cursor: 'pointer',
                    }}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => setDeletingId(loc.id)}
                    style={{
                      padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                      border: '1.5px solid #FCA5A5', background: 'transparent',
                      color: '#DC2626', fontFamily: 'DM Sans', cursor: 'pointer',
                    }}
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </motion.div>
            ))}
                </>
              );
            })()}
          </motion.div>
        )}

        {/* Contributions */}
        {activeTab === 'contributions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            <SearchBar
              value={searchContributions}
              onChange={setSearchContributions}
              placeholder="Rechercher par nom de lieu…"
            />
            {contributions.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                Aucune contribution
              </p>
            )}
            {(() => {
              const filteredContribs = contributions.filter((contrib: any) => {
                const loc = locations.find((l) => l.id === contrib.location_id);
                return matchSearch(searchContributions, loc?.name);
              });
              return (
                <>
                  {contributions.length > 0 && (
                    <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {filteredContribs.length} {filteredContribs.length > 1 ? 'contributions affichées' : 'contribution affichée'}
                    </div>
                  )}
                  {contributions.length > 0 && filteredContribs.length === 0 && (
                    <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                      Aucun résultat
                    </p>
                  )}
                  {filteredContribs.map((contrib: any, i: number) => {
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
                  <div className="flex gap-4 flex-wrap mb-3" style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {contrib.high_chair !== null && <span>🪑 Chaise haute {contrib.high_chair ? '✓' : '✗'}</span>}
                    {contrib.changing_table !== null && <span>👶 Table à langer {contrib.changing_table ? '✓' : '✗'}</span>}
                    {contrib.kids_area !== null && <span>🌳 Espace jeux {contrib.kids_area ? '✓' : '✗'}</span>}
                    {contrib.bookable !== null && <span>📅 Réservation: {contrib.bookable === 'yes' ? 'Oui ✓' : contrib.bookable === 'no' ? 'Non ✗' : '?'}</span>}
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
                </>
              );
            })()}
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
                    <option value="coiffeur">✂️ Coiffeur</option>
                  </select>
                </div>
                <div>
                  <FormField label="Adresse *" value={form.address} onChange={(v) => { updateForm('address', v); setShowManualCoords(false); }} placeholder="Ex: 6 rue Saint-Léonard, 44000 Nantes" />
                  <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px', fontFamily:'DM Sans'}}>
                    Incluez le numéro, la rue et le code postal pour de meilleurs résultats.
                  </div>
                  {showManualCoords && (
                    <div style={{
                      padding:'12px', borderRadius:'var(--radius-sm)',
                      background:'var(--accent-light)',
                      border:'1px solid #F2C94C',
                      marginTop:'8px'
                    }}>
                      <div style={{fontFamily:'Caveat', fontSize:'14px', color:'#C49A35', marginBottom:'8px'}}>
                        Adresse non reconnue — ajustez les coordonnées ✦
                      </div>
                      <div style={{display:'flex', gap:'8px'}}>
                        <div style={{flex:1}}>
                          <label style={{fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'4px'}}>
                            Latitude
                          </label>
                          <input
                            value={manualLat}
                            onChange={e => setManualLat(e.target.value)}
                            style={{width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'DM Sans', fontSize:'14px'}}
                          />
                        </div>
                        <div style={{flex:1}}>
                          <label style={{fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'4px'}}>
                            Longitude
                          </label>
                          <input
                            value={manualLng}
                            onChange={e => setManualLng(e.target.value)}
                            style={{width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'DM Sans', fontSize:'14px'}}
                          />
                        </div>
                      </div>
                      <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'6px', fontFamily:'DM Sans'}}>
                        Astuce : trouvez les coordonnées sur maps.google.com en faisant clic droit sur le lieu.
                      </div>
                    </div>
                  )}
                </div>

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

                {/* Website */}
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Site web
                  </label>
                  <input
                    value={form.website}
                    onChange={(e) => updateForm('website', e.target.value)}
                    placeholder="https://www.lepetitbeurre.fr"
                    style={{ width: '100%', padding: '13px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '15px' }}
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Instagram
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '15px' }}>@</span>
                    <input
                      value={form.instagram}
                      onChange={(e) => updateForm('instagram', e.target.value)}
                      placeholder="lepetitbeurre_nantes"
                      style={{ width: '100%', padding: '13px 16px 13px 30px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '15px' }}
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    Note (optionnelle)
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(e) => updateForm('note', e.target.value.slice(0, 500))}
                    placeholder="Un mot sur ce lieu, une info pratique…"
                    maxLength={500}
                    rows={3}
                    style={{ width: '100%', padding: '13px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '15px', resize: 'none' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                    {(form.note || '').length}/500
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-1">
                  <Toggle label="Chaise haute" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                  <Toggle label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                  <Toggle label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
                </div>

                {(form.category === 'restaurant' || form.category === 'cafe') && (
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Réservation
                    </label>
                    <select
                      value={form.bookable}
                      onChange={(e) => updateForm('bookable', e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '12px',
                        border: '1px solid var(--border)', background: 'var(--bg)',
                        fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', outline: 'none',
                      }}
                    >
                      <option value="unknown">Non renseigné</option>
                      <option value="yes">Accepte les réservations</option>
                      <option value="no">Sans réservation</option>
                    </select>
                  </div>
                )}

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

                <MealsEditor mealTypes={mealTypes} state={addMeals} onChange={setAddMeals} />

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

      {/* Delete confirmation modal */}
      {deletingId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setDeletingId(null)}
        >
          <div
            style={{ background: 'white', width: '100%', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'Fraunces', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>
              Supprimer ce lieu ?
            </div>
            <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Cette action est irréversible ✦
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{ flex: 1, padding: '14px', borderRadius: '100px', border: '1.5px solid var(--border)', background: 'transparent', fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  await supabase.from('locations').delete().eq('id', deletingId);
                  queryClient.invalidateQueries({ queryKey: ['all-locations'] });
                  queryClient.invalidateQueries({ queryKey: ['locations'] });
                  queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                  setDeletingId(null);
                  toast({ title: 'Lieu supprimé' });
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '100px', background: '#DC2626', border: 'none', fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {editingId && editForm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setEditingId(null)}
        >
          <div
            style={{ background: 'white', width: '100%', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'Fraunces', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              Modifier le lieu
            </div>
            <div className="flex flex-col gap-4">
              <FormField label="Nom" value={editForm.name} onChange={(v) => setEditForm((f: any) => ({ ...f, name: v }))} />
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Catégorie</label>
                <select value={editForm.category} onChange={(e) => setEditForm((f: any) => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', outline: 'none' }}>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="cafe">☕ Café</option>
                  <option value="shop">🛍️ Boutique</option>
                  <option value="public">🌳 Lieu public</option>
                  <option value="coiffeur">✂️ Coiffeur</option>
                </select>
              </div>
              <FormField label="Adresse" value={editForm.address} onChange={(v) => setEditForm((f: any) => ({ ...f, address: v }))} />
              <FormField label="Site web" value={editForm.website} onChange={(v) => setEditForm((f: any) => ({ ...f, website: v }))} placeholder="https://..." />
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Instagram</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '15px' }}>@</span>
                  <input value={editForm.instagram} onChange={(e) => setEditForm((f: any) => ({ ...f, instagram: e.target.value }))} placeholder="compte_instagram" style={{ width: '100%', padding: '13px 16px 13px 30px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '15px' }} />
                </div>
              </div>
              <FormField label="URL photo" value={editForm.photo} onChange={(v) => setEditForm((f: any) => ({ ...f, photo: v }))} placeholder="https://..." />
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Note</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, note: e.target.value.slice(0, 500) }))}
                  placeholder="Un mot sur ce lieu, une info pratique…"
                  maxLength={500}
                  rows={3}
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '15px', resize: 'none' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>{(editForm.note || '').length}/500</div>
              </div>
              <div className="flex flex-col gap-3">
                <Toggle label="Chaise haute" checked={editForm.high_chair} onChange={(v) => setEditForm((f: any) => ({ ...f, high_chair: v }))} />
                <Toggle label="Table à langer" checked={editForm.changing_table} onChange={(v) => setEditForm((f: any) => ({ ...f, changing_table: v }))} />
                <Toggle label="Espace jeux" checked={editForm.kids_area} onChange={(v) => setEditForm((f: any) => ({ ...f, kids_area: v }))} />
              </div>
              {(editForm.category === 'restaurant' || editForm.category === 'cafe') && (
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Réservation</label>
                  <select value={editForm.bookable} onChange={(e) => setEditForm((f: any) => ({ ...f, bookable: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', outline: 'none' }}>
                    <option value="unknown">Non renseigné</option>
                    <option value="yes">Accepte les réservations</option>
                    <option value="no">Sans réservation</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Statut</label>
                <select value={editForm.status} onChange={(e) => setEditForm((f: any) => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', outline: 'none' }}>
                  <option value="pending">En attente</option>
                  <option value="published">Publié</option>
                  <option value="unpublished">Masqué</option>
                </select>
              </div>

              <MealsEditor mealTypes={mealTypes} state={editMeals} onChange={setEditMeals} />

              <button
                onClick={async () => {
                  const { error } = await supabase
                    .from('locations')
                    .update({
                      name: editForm.name,
                      category: editForm.category,
                      address: editForm.address,
                      website: editForm.website || null,
                      instagram: editForm.instagram || null,
                      photo: editForm.photo || null,
                      note: editForm.note || null,
                      high_chair: editForm.high_chair,
                      changing_table: editForm.changing_table,
                      kids_area: editForm.kids_area,
                      bookable: editForm.bookable,
                      status: editForm.status,
                    } as any)
                    .eq('id', editingId);
                  if (error) {
                    toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
                    return;
                  }

                  // Persist meals: upsert ON, delete OFF
                  const toUpsert = Object.entries(editMeals)
                    .filter(([, v]) => v.enabled)
                    .map(([meal_type_id, v]) => {
                      const mt = mealTypes.find((m) => m.id === meal_type_id);
                      return {
                        location_id: editingId!,
                        meal_type_id,
                        time_open: v.time_open || mt?.default_time_start || null,
                        time_close: v.time_close || mt?.default_time_end || null,
                        is_confirmed: true,
                      };
                    });
                  const toDelete = Object.entries(editMeals)
                    .filter(([, v]) => !v.enabled)
                    .map(([meal_type_id]) => meal_type_id);

                  if (toUpsert.length > 0) {
                    await supabase
                      .from('location_meals')
                      .upsert(toUpsert, { onConflict: 'location_id,meal_type_id' });
                  }
                  if (toDelete.length > 0) {
                    await supabase
                      .from('location_meals')
                      .delete()
                      .eq('location_id', editingId!)
                      .in('meal_type_id', toDelete);
                  }

                  queryClient.invalidateQueries({ queryKey: ['all-locations'] });
                  queryClient.invalidateQueries({ queryKey: ['locations'] });
                  queryClient.invalidateQueries({ queryKey: ['location_meals'] });
                  setEditingId(null);
                  toast({ title: 'Lieu mis à jour ✓' });
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#fff', fontFamily: 'DM Sans', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
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

function MealsEditor({
  mealTypes,
  state,
  onChange,
}: {
  mealTypes: MealType[];
  state: MealsState;
  onChange: (s: MealsState) => void;
}) {
  if (mealTypes.length === 0) return null;

  const update = (id: string, patch: Partial<MealsState[string]>) => {
    onChange({ ...state, [id]: { ...state[id], ...patch } });
  };

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
      <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
        Repas & Horaires
      </div>
      <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Active les services disponibles ✦
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {mealTypes.map((mt) => {
          const v = state[mt.id] ?? { enabled: false, time_open: '', time_close: '', confirmed_count: 0 };
          return (
            <div
              key={mt.id}
              style={{
                padding: '12px', borderRadius: '12px',
                border: '1px solid var(--border)', background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{mt.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px' }}>
                    {mt.label}
                  </div>
                  {v.confirmed_count > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {v.confirmed_count} confirmation{v.confirmed_count > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => update(mt.id, { enabled: !v.enabled })}
                  style={{
                    width: 44, height: 24, borderRadius: 100,
                    background: v.enabled ? (mt.fill_hex || 'var(--primary)') : 'var(--border)',
                    position: 'relative', border: 'none', cursor: 'pointer',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: v.enabled ? 23 : 3,
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
              {v.enabled && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder={mt.default_time_start ?? '12:00'}
                    value={v.time_open}
                    onChange={(e) => update(mt.id, { time_open: e.target.value })}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--surface)',
                      fontFamily: 'DM Sans', fontSize: '13px', outline: 'none',
                    }}
                  />
                  <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>–</span>
                  <input
                    type="text"
                    placeholder={mt.default_time_end ?? '15:00'}
                    value={v.time_close}
                    onChange={(e) => update(mt.id, { time_close: e.target.value })}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--surface)',
                      fontFamily: 'DM Sans', fontSize: '13px', outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProposalsTab({ geocodeAddress, queryClient, toast }: {
  geocodeAddress: (address: string) => Promise<{lat: number; lng: number} | null>;
  queryClient: any;
  toast: any;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [manualCoordsProposal, setManualCoordsProposal] = useState<string | null>(null);
  const [proposalManualLat, setProposalManualLat] = useState('47.2184');
  const [proposalManualLng, setProposalManualLng] = useState('-1.5536');
  const [searchProposals, setSearchProposals] = useState('');

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data } = await supabase.from('location_proposals' as any).select('*').order('created_at', { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const handleApprove = async (proposal: any, useManualCoords = false) => {
    setProcessingId(proposal.id);
    try {
      let coords: { lat: number; lng: number } | null = null;

      if (useManualCoords) {
        coords = { lat: parseFloat(proposalManualLat), lng: parseFloat(proposalManualLng) };
      } else {
        coords = await geocodeAddress(proposal.address);
        if (!coords) {
          setManualCoordsProposal(proposal.id);
          toast({ title: 'Adresse non trouvée automatiquement', description: 'Ajustez les coordonnées manuellement.', variant: 'destructive' });
          setProcessingId(null);
          return;
        }
      }
      const insertData: any = {
        name: proposal.name,
        category: proposal.category,
        address: proposal.address,
        lat: coords.lat,
        lng: coords.lng,
        high_chair: proposal.high_chair ?? false,
        changing_table: proposal.changing_table ?? false,
        kids_area: proposal.kids_area ?? false,
        photo: proposal.photo ?? null,
        website: proposal.website ?? null,
        instagram: proposal.instagram ?? null,
        note: proposal.note ?? null,
        status: 'published',
      };
      if ((proposal.category === 'restaurant' || proposal.category === 'cafe') && proposal.bookable) {
        insertData.bookable = proposal.bookable;
      }
      const { data: insertedLocation, error: insertError } = await supabase
        .from('locations')
        .insert(insertData as any)
        .select('id')
        .single();
      if (insertError) throw insertError;

      // If the proposal carried meal_types in metadata, create location_meals entries
      const proposalMealTypes: string[] = (proposal.metadata as any)?.meal_types ?? [];
      if (insertedLocation?.id && Array.isArray(proposalMealTypes) && proposalMealTypes.length > 0) {
        // Fetch defaults so we can populate time_open/close from meal_types
        const { data: mealTypesData } = await supabase
          .from('meal_types')
          .select('id, default_time_start, default_time_end')
          .in('id', proposalMealTypes);
        const defaultsById = new Map<string, { start: string | null; end: string | null }>(
          (mealTypesData ?? []).map((mt: any) => [mt.id, { start: mt.default_time_start, end: mt.default_time_end }])
        );
        const mealRows = proposalMealTypes.map((mealId) => ({
          location_id: insertedLocation.id,
          meal_type_id: mealId,
          time_open: defaultsById.get(mealId)?.start ?? null,
          time_close: defaultsById.get(mealId)?.end ?? null,
          is_confirmed: false,
          confirmed_count: 0,
          created_by: proposal.user_id ?? null,
        }));
        const { error: mealsError } = await supabase
          .from('location_meals')
          .upsert(mealRows, { onConflict: 'location_id,meal_type_id' });
        if (mealsError) console.error('Failed to insert location_meals from proposal:', mealsError);
      }

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
      <SearchBar
        value={searchProposals}
        onChange={setSearchProposals}
        placeholder="Rechercher par nom, adresse ou site web…"
      />
      {proposals.length === 0 && (
        <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
          Aucune proposition
        </p>
      )}
      {(() => {
        const filteredProposals = proposals.filter((p: any) =>
          matchSearch(searchProposals, p.name, p.address, p.website)
        );
        return (
          <>
            {proposals.length > 0 && (
              <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {filteredProposals.length} {filteredProposals.length > 1 ? 'propositions affichées' : 'proposition affichée'}
              </div>
            )}
            {proposals.length > 0 && filteredProposals.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                Aucun résultat
              </p>
            )}
            {filteredProposals.map((proposal: any, i: number) => {
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
                {proposal.photo && (
                  <img src={proposal.photo} alt={proposal.name} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                )}
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
              <>
                {manualCoordsProposal === proposal.id && (
                  <div style={{
                    padding:'12px', borderRadius:'var(--radius-sm)',
                    background:'var(--accent-light)',
                    border:'1px solid #F2C94C',
                    marginBottom:'8px'
                  }}>
                    <div style={{fontFamily:'Caveat', fontSize:'14px', color:'#C49A35', marginBottom:'8px'}}>
                      Adresse non reconnue — ajustez les coordonnées ✦
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <div style={{flex:1}}>
                        <label style={{fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'4px'}}>
                          Latitude
                        </label>
                        <input
                          value={proposalManualLat}
                          onChange={e => setProposalManualLat(e.target.value)}
                          style={{width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'DM Sans', fontSize:'14px'}}
                        />
                      </div>
                      <div style={{flex:1}}>
                        <label style={{fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'4px'}}>
                          Longitude
                        </label>
                        <input
                          value={proposalManualLng}
                          onChange={e => setProposalManualLng(e.target.value)}
                          style={{width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'DM Sans', fontSize:'14px'}}
                        />
                      </div>
                    </div>
                    <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'6px', fontFamily:'DM Sans'}}>
                      Astuce : trouvez les coordonnées sur maps.google.com en faisant clic droit sur le lieu.
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(proposal, manualCoordsProposal === proposal.id)}
                    disabled={isProcessing}
                    style={{
                      flex: 1, fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                      padding: '8px', borderRadius: '100px', border: 'none',
                      background: 'var(--secondary)', color: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    {isProcessing ? 'En cours…' : manualCoordsProposal === proposal.id ? '✓ Approuver avec ces coordonnées' : '✓ Approuver'}
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
              </>
            )}
          </motion.div>
        );
      })}
          </>
        );
      })()}
    </motion.div>
  );
}

export default AdminPage;
