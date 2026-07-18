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
import PhotoUpload from '@/components/admin/PhotoUpload';
import { useUserEmails } from '@/hooks/useUserEmails';
import { useTopContributors } from '@/hooks/useTopContributors';
import { EVENT_CATEGORIES, EVENT_WEATHERS, eventCategoryHex, eventCategoryEmoji } from '@/types/event';

type AdminTab = 'dashboard' | 'locations' | 'contributions' | 'add' | 'proposals' | 'events';

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
  { key: 'events', label: 'Événements' },
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
  const { isAdmin, isLoading: authLoading, profile, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchLocations, setSearchLocations] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished' | 'pending'>('published');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [searchContributions, setSearchContributions] = useState('');

  useEffect(() => {
    // Wait until auth AND profile are resolved before deciding admin status
    if (authLoading) return;
    if (!user) return; // AuthGate handles unauthenticated state
    if (profile === null) return; // profile still loading
    if (!isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, profile, user, navigate]);

  const { data: locations = [] } = useAllLocations();
  const { data: contributions = [] } = useContributions();
  const contributionUserIds = useMemo(
    () => Array.from(new Set((contributions as any[]).map((c) => c.user_id).filter(Boolean))),
    [contributions]
  );
  const { data: contribEmails = {} } = useUserEmails(contributionUserIds, isAdmin);

  const { data: topContributors } = useTopContributors(isAdmin);
  const topUserIds = useMemo(() => {
    if (!topContributors) return [];
    return [
      ...topContributors.proposals.map((e) => e.user_id),
      ...topContributors.contributions.map((e) => e.user_id),
    ];
  }, [topContributors]);
  const { data: topEmails = {} } = useUserEmails(topUserIds, isAdmin);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    enabled: isAdmin,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString();
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      const adminIds = new Set<string>(((adminProfiles ?? []) as any[]).map((p) => p.id));
      const notAdmin = (uid: string | null | undefined) => !!uid && !adminIds.has(uid);
      const notAdminOrAnon = (uid: string | null | undefined) => !uid || !adminIds.has(uid);

      const [locationsRes, contributionsRes, usersRes, dailyRes, proposalsRes, viewsRes, views7dRes, acquisitionRes, eventsRes] = await Promise.all([
        supabase.from('locations').select('id, status'),
        supabase.from('contributions').select('id, user_id, created_at, status'),
        supabase.from('profiles').select('id, role, created_at').gte('created_at', since),
        supabase.from('contributions').select('user_id, created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('location_proposals' as any).select('id, user_id, status'),
        supabase.from('page_views' as any).select('user_id, created_at').gte('created_at', since),
        supabase.from('page_views' as any).select('user_id, created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('profiles').select('id, acquisition_source').not('acquisition_source', 'is', null),
        supabase.from('events' as any).select('id, name, status, user_id, created_at, date_start').order('created_at', { ascending: false }),
      ]);

      const contribs = (contributionsRes.data ?? []).filter((c: any) => notAdmin(c.user_id));
      const proposals = ((proposalsRes.data ?? []) as any[]).filter((p) => notAdmin(p.user_id));
      const newUsers = (usersRes.data ?? []).filter((u: any) => u.role !== 'admin');
      const daily = (dailyRes.data ?? []).filter((c: any) => notAdmin(c.user_id));

      const views = (((viewsRes.data ?? []) as unknown) as { user_id: string | null; created_at: string }[])
        .filter((v) => notAdminOrAnon(v.user_id));
      const totalVisits = views.length;
      const loggedInUsers = new Set<string>();
      const userDays = new Map<string, Set<string>>();
      for (const v of views) {
        if (!v.user_id) continue;
        loggedInUsers.add(v.user_id);
        const day = v.created_at.slice(0, 10);
        if (!userDays.has(v.user_id)) userDays.set(v.user_id, new Set());
        userDays.get(v.user_id)!.add(day);
      }
      let recurring = 0;
      userDays.forEach((days) => { if (days.size >= 2) recurring++; });

      const visits7d = (((views7dRes.data ?? []) as unknown) as { user_id: string | null; created_at: string }[])
        .filter((v) => notAdminOrAnon(v.user_id));

      const acquisitionProfiles = (acquisitionRes.data ?? []).filter((p: any) => !adminIds.has(p.id));
      const acquisitionCounts: Record<string, number> = {};
      for (const p of acquisitionProfiles) {
        const src = p.acquisition_source as string;
        acquisitionCounts[src] = (acquisitionCounts[src] ?? 0) + 1;
      }

      const allEvents = ((eventsRes.data ?? []) as any[]);
      const pendingEventsList = allEvents.filter((e) => e.status === 'pending');

      return {
        totalLocations: locationsRes.data?.length ?? 0,
        publishedLocations: locationsRes.data?.filter((l) => l.status === 'published').length ?? 0,
        pendingLocations: locationsRes.data?.filter((l) => l.status === 'pending').length ?? 0,
        totalContributions: contribs.length,
        pendingContributions: contribs.filter((c: any) => c.status === 'pending').length,
        pendingProposals: proposals.filter((p) => p.status === 'pending').length,
        pendingEvents: pendingEventsList.length,
        pendingEventsList: pendingEventsList.slice(0, 5),
        activeUsers30d: newUsers.length,
        contributionsLast7d: daily,
        visitsLast7d: visits7d,
        totalVisits30d: totalVisits,
        uniqueLoggedVisitors30d: loggedInUsers.size,
        recurringVisitors30d: recurring,
        acquisitionDistribution: acquisitionCounts,
        acquisitionTotal: acquisitionProfiles.length,
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

  const visitsChartData = useMemo(() => {
    const days = getLast7Days();
    const counts = days.map((day) => {
      const count = (stats?.visitsLast7d ?? []).filter(
        (v: any) => v.created_at?.slice(0, 10) === day
      ).length;
      return { day, count, label: getDayLabel(day) };
    });
    const max = Math.max(...counts.map((c) => c.count), 1);
    return { counts, max };
  }, [stats?.visitsLast7d]);

  // Add location form
  const [form, setForm] = useState({
    name: '',
    category: 'restaurant',
    address: '',
    high_chair: false,
    changing_table: false,
    kids_area: false,
    kids_menu: false,
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
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);

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

  // Edit-modal coordinates state
  const [editOriginalAddress, setEditOriginalAddress] = useState('');
  const [editOriginalLat, setEditOriginalLat] = useState<number | null>(null);
  const [editOriginalLng, setEditOriginalLng] = useState<number | null>(null);
  const [editManualLat, setEditManualLat] = useState('');
  const [editManualLng, setEditManualLng] = useState('');
  const [showEditManualCoords, setShowEditManualCoords] = useState(false);
  const [editGeocoding, setEditGeocoding] = useState(false);

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
      if ((contrib as any).kids_menu !== null && (contrib as any).kids_menu !== undefined) updateData.kids_menu = (contrib as any).kids_menu;
      if (contrib.bookable !== null) updateData.bookable = contrib.bookable;

      // Parse JSON content (may carry equipment + meal_types)
      let parsedContent: any = null;
      if (contrib.content) {
        try { parsedContent = JSON.parse(contrib.content); } catch { /* ignore */ }
      }
      // Equipment from JSON content (overrides only for non-null values)
      if (parsedContent?.equipment) {
        const eq = parsedContent.equipment;
        if (eq.high_chair === true || eq.high_chair === false) updateData.high_chair = eq.high_chair;
        if (eq.changing_table === true || eq.changing_table === false) updateData.changing_table = eq.changing_table;
        if (eq.kids_area === true || eq.kids_area === false) updateData.kids_area = eq.kids_area;
        if (eq.kids_menu === true || eq.kids_menu === false) updateData.kids_menu = eq.kids_menu;
      }
      if (Object.keys(updateData).length > 0) {
        await supabase.from('locations').update(updateData).eq('id', contrib.location_id);
      }

      // Handle meal_types contributions: upsert each meal into location_meals
      if (contrib.type === 'meal_types' && parsedContent) {
        try {
          const mealIds: string[] = parsedContent?.meal_types ?? [];
          if (mealIds.length > 0) {
            // Fetch existing meals to know which exist (to bump confirmed_count)
            const { data: existing } = await supabase
              .from('location_meals')
              .select('meal_type_id, confirmed_count')
              .eq('location_id', contrib.location_id)
              .in('meal_type_id', mealIds);
            const existingMap = new Map(
              (existing ?? []).map((r: any) => [r.meal_type_id, r.confirmed_count ?? 0])
            );
            const rows = mealIds.map((mid) => ({
              location_id: contrib.location_id,
              meal_type_id: mid,
              is_confirmed: true,
              confirmed_count: (existingMap.get(mid) ?? 0) + 1,
              time_open: null,
              time_close: null,
            }));
            await supabase
              .from('location_meals')
              .upsert(rows, { onConflict: 'location_id,meal_type_id' });
            queryClient.invalidateQueries({ queryKey: ['location_meals'] });
          }
        } catch (e) {
          console.error('Failed to process meal_types contribution', e);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['contributions'] });
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    toast({ title: action === 'validated' ? 'Contribution validée ✓' : 'Contribution rejetée' });
  };

  const hideContribution = async (contrib: any) => {
    const { error } = await supabase.from('contributions').update({ status: 'rejected' }).eq('id', contrib.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['contributions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['location-contributions'] });
    toast({ title: 'Contribution masquée' });
  };

  const deleteContribution = async (contrib: any) => {
    if (!window.confirm('Supprimer définitivement cette contribution ? Cette action est irréversible.')) return;
    const { error } = await supabase.from('contributions').delete().eq('id', contrib.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['contributions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['location-contributions'] });
    toast({ title: 'Contribution supprimée' });
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
      kids_menu: form.kids_menu,
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

    // Insert meals for new location (only if category supports meals)
    const supportsMeals = form.category === 'restaurant' || form.category === 'cafe';
    const mealRows = supportsMeals ? Object.entries(addMeals)
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
      }) : [];
    if (mealRows.length > 0) {
      await supabase.from('location_meals').insert(mealRows);
    }

    setSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['location_meals'] });
    toast({ title: 'Lieu ajouté ✓' });
    setForm({ name: '', category: 'restaurant', address: '', high_chair: false, changing_table: false, kids_area: false, kids_menu: false, bookable: 'unknown', status: 'pending', website: '', instagram: '', note: '' });
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
        <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)' }}>Kidmapp — Nantes ✦</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <StatCard label="Lieux publiés" value={stats?.publishedLocations ?? 0} sub={`/ ${stats?.totalLocations ?? 0} total`} />
              <StatCard label="Lieux internes à valider" value={stats?.pendingLocations ?? 0} sub="status pending" />
              <StatCard label="Propositions en attente" value={stats?.pendingProposals ?? 0} sub="ajouts utilisateurs" />
              <StatCard label="Contributions" value={stats?.pendingContributions ?? 0} sub="en attente" />
              <StatCard label="Événements à valider" value={stats?.pendingEvents ?? 0} sub="propositions" />
              <StatCard label="Nouveaux inscrits 30j" value={stats?.activeUsers30d ?? 0} sub="comptes créés" />
            </div>

            {(stats?.pendingEvents ?? 0) > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                  <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text)', fontWeight: 600 }}>
                    Événements à valider ({stats?.pendingEvents})
                  </div>
                  <button
                    onClick={() => setActiveTab('events')}
                    style={{ fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '100px', border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}
                  >
                    Voir tout
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {(stats?.pendingEventsList ?? []).map((ev: any) => (
                    <div key={ev.id} className="flex items-center justify-between" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                      <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                        {ev.name}
                      </div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {ev.user_id ? '👤 user' : '📰 sourcing'} · {new Date(ev.date_start).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
              Audience — 30 derniers jours ✦
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <StatCard label="Visites" value={stats?.totalVisits30d ?? 0} sub="hits bruts" />
              <StatCard label="Visiteurs connectés" value={stats?.uniqueLoggedVisitors30d ?? 0} sub="uniques (auth)" />
              <StatCard label="Récurrents" value={stats?.recurringVisitors30d ?? 0} sub="≥ 2 jours" />
            </div>

            {/* Visits chart */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '12px' }}>
                Visites — 7 derniers jours
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '96px' }}>
                {visitsChartData.counts.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{d.count}</span>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max((d.count / visitsChartData.max) * 60, 4)}px`,
                        background: 'var(--accent)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                      title={`${d.count} visite${d.count > 1 ? 's' : ''}`}
                    />
                    <span style={{ fontFamily: 'DM Sans', fontSize: '10px', color: 'var(--text-muted)' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini chart */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '12px' }}>
                Contributions — 7 derniers jours
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '96px' }}>
                {chartData.counts.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{d.count}</span>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max((d.count / chartData.max) * 60, 4)}px`,
                        background: 'var(--primary)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                      title={`${d.count} contribution${d.count > 1 ? 's' : ''}`}
                    />
                    <span style={{ fontFamily: 'DM Sans', fontSize: '10px', color: 'var(--text-muted)' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acquisition sources */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '12px' }}>
                D'où nous connaissent-ils ? — {stats?.acquisitionTotal ?? 0} réponses
              </div>
              <AcquisitionChart distribution={stats?.acquisitionDistribution ?? {}} total={stats?.acquisitionTotal ?? 0} />
            </div>

            {/* Top contributeurs */}
            <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginTop: '24px', marginBottom: '8px', fontWeight: 500 }}>
              Top contributeurs (hors admin) ✦
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <TopList
                title="Propositions de lieux"
                entries={topContributors?.proposals ?? []}
                emails={topEmails}
                approvedLabel="approuvées"
              />
              <TopList
                title="Contributions équipements"
                entries={topContributors?.contributions ?? []}
                emails={topEmails}
                approvedLabel="validées"
              />
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
              const counts = {
                all: locations.length,
                published: locations.filter((l) => l.status === 'published').length,
                unpublished: locations.filter((l) => l.status === 'unpublished').length,
                pending: locations.filter((l) => l.status === 'pending').length,
              };
              const statusOptions: { key: typeof statusFilter; label: string }[] = [
                { key: 'all', label: 'Tous' },
                { key: 'published', label: 'Publiés' },
                { key: 'unpublished', label: 'Masqués' },
                { key: 'pending', label: 'À valider' },
              ];
              return (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {statusOptions.map((o) => {
                      const active = statusFilter === o.key;
                      return (
                        <button
                          key={o.key}
                          onClick={() => setStatusFilter(o.key)}
                          style={{
                            padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                            border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                            background: active ? 'var(--primary)' : 'transparent',
                            color: active ? 'white' : 'var(--text-muted)',
                            fontFamily: 'DM Sans', cursor: 'pointer',
                          }}
                        >
                          {o.label} ({counts[o.key]})
                        </button>
                      );
                    })}
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    style={{
                      padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg)', fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)',
                    }}
                  >
                    <option value="recent">Plus récents</option>
                    <option value="oldest">Plus anciens</option>
                    <option value="name">Nom A→Z</option>
                  </select>
                </div>
              );
            })()}
            {(() => {
              const filtered = locations
                .filter((loc) => statusFilter === 'all' || loc.status === statusFilter)
                .filter((loc) =>
                  matchSearch(searchLocations, loc.name, loc.address, (loc as any).website)
                )
                .sort((a, b) => {
                  if (sortBy === 'name') return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
                  const da = new Date(a.created_at).getTime();
                  const db = new Date(b.created_at).getTime();
                  return sortBy === 'recent' ? db - da : da - db;
                });
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <StatusBadge status={loc.status} />
                      <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>
                        Ajouté le {new Date(loc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
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
                      setEditPhotoFile(null);
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
                        kids_menu: (loc as any).kids_menu ?? false,
                        bookable: (loc as any).bookable ?? 'unknown',
                        status: loc.status,
                        age_min: (loc as any).age_min != null ? String((loc as any).age_min) : '',
                        age_max: (loc as any).age_max != null ? String((loc as any).age_max) : '',
                      });
                      setEditOriginalAddress(loc.address ?? '');
                      setEditOriginalLat(loc.lat ?? null);
                      setEditOriginalLng(loc.lng ?? null);
                      setEditManualLat(loc.lat != null ? String(loc.lat) : '');
                      setEditManualLng(loc.lng != null ? String(loc.lng) : '');
                      setShowEditManualCoords(false);
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
                    const isMealContrib = contrib.type === 'meal_types';
                    let mealIds: string[] = [];
                    let mealComment: string | null = null;
                    let jsonEquipment: { high_chair?: boolean | null; changing_table?: boolean | null; kids_area?: boolean | null } | null = null;
                    if (contrib.content) {
                      try {
                        const parsed = JSON.parse(contrib.content);
                        if (isMealContrib) {
                          mealIds = Array.isArray(parsed?.meal_types) ? parsed.meal_types : [];
                        }
                        mealComment = parsed?.comment ?? null;
                        if (parsed?.equipment && typeof parsed.equipment === 'object') {
                          jsonEquipment = parsed.equipment;
                        }
                      } catch { /* ignore */ }
                    }
                    const equipItems: { emoji: string; label: string; value: boolean | null | undefined }[] = jsonEquipment
                      ? [
                          { emoji: '🪑', label: 'Chaise haute / réhausseur', value: jsonEquipment.high_chair },
                          { emoji: '👶', label: 'Table à langer', value: jsonEquipment.changing_table },
                          { emoji: '🎨', label: 'Espace jeux', value: jsonEquipment.kids_area },
                          { emoji: '🍽️', label: 'Menu enfant', value: (jsonEquipment as any).kids_menu },
                        ].filter((e) => e.value !== undefined && e.value !== null)
                      : [];
                    return (
                <motion.div
                  key={contrib.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '14px', boxShadow: 'var(--shadow)' }}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <div style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                        {loc?.name ?? 'Lieu inconnu'}
                      </div>
                      {isMealContrib && (
                        <span style={{
                          fontFamily: 'DM Sans', fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: 100,
                          background: 'var(--primary)', color: '#fff',
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                        }}>
                          Repas
                        </span>
                      )}
                    </div>
                    <StatusBadge status={contrib.status} />
                  </div>
                  <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '8px', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span>{new Date(contrib.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                    {contrib.user_id && contribEmails[contrib.user_id] && (
                      <a href={`mailto:${contribEmails[contrib.user_id]}`} style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                        ✉ {contribEmails[contrib.user_id]}
                      </a>
                    )}
                  </div>
                  {isMealContrib ? (
                    <div style={{ marginBottom: '10px' }}>
                      {mealIds.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {mealIds.map((id) => {
                            const mt = mealTypes.find((m) => m.id === id);
                            if (!mt) return null;
                            return (
                              <span
                                key={id}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 100,
                                  background: mt.bg_hex || 'var(--bg)',
                                  fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                                  color: 'var(--text)',
                                }}
                              >
                                <span style={{ fontSize: 14 }}>{mt.emoji}</span>
                                {mt.short_label || mt.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {equipItems.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {equipItems.map((e) => (
                            <span
                              key={e.label}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 100,
                                background: e.value ? '#EBF6EC' : '#FEF0EC',
                                color: e.value ? '#2E7D32' : 'var(--primary)',
                                fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{e.emoji}</span>
                              {e.label} {e.value ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      )}
                      {mealComment && (
                        <div style={{
                          fontFamily: 'DM Sans', fontSize: '13px',
                          color: 'var(--text-muted)', fontStyle: 'italic',
                          padding: '8px 12px', borderRadius: 10,
                          background: 'var(--bg)',
                        }}>
                          « {mealComment} »
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="flex gap-4 flex-wrap mb-2" style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {contrib.high_chair !== null && <span>🪑 Chaise haute / réhausseur {contrib.high_chair ? '✓' : '✗'}</span>}
                        {contrib.changing_table !== null && <span>👶 Table à langer {contrib.changing_table ? '✓' : '✗'}</span>}
                        {contrib.kids_area !== null && <span>🎨 Espace jeux {contrib.kids_area ? '✓' : '✗'}</span>}
                        {(contrib as any).kids_menu !== null && (contrib as any).kids_menu !== undefined && <span>🍽️ Menu enfant {(contrib as any).kids_menu ? '✓' : '✗'}</span>}
                        {contrib.bookable !== null && <span>📅 Réservation: {contrib.bookable === 'yes' ? 'Oui ✓' : contrib.bookable === 'no' ? 'Non ✗' : '?'}</span>}
                      </div>
                      {equipItems.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {equipItems.map((e) => (
                            <span
                              key={e.label}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 100,
                                background: e.value ? '#EBF6EC' : '#FEF0EC',
                                color: e.value ? '#2E7D32' : 'var(--primary)',
                                fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{e.emoji}</span>
                              {e.label} {e.value ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      )}
                      {mealComment && (
                        <div style={{
                          fontFamily: 'DM Sans', fontSize: '13px',
                          color: 'var(--text-muted)', fontStyle: 'italic',
                          padding: '8px 12px', borderRadius: 10,
                          background: 'var(--bg)',
                        }}>
                          « {mealComment} »
                        </div>
                      )}
                    </div>
                  )}
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
                  {contrib.status !== 'pending' && (
                    <div className="flex gap-2">
                      {contrib.status === 'validated' && (
                        <button
                          onClick={() => hideContribution(contrib)}
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
                          👁 Masquer
                        </button>
                      )}
                      <button
                        onClick={() => deleteContribution(contrib)}
                        style={{
                          flex: 1,
                          fontFamily: 'DM Sans',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '8px',
                          borderRadius: '100px',
                          border: '1.5px solid var(--primary)',
                          background: 'transparent',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                        }}
                      >
                        🗑 Supprimer
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

        {/* Events */}
        {activeTab === 'events' && (
          <EventsTab geocodeAddress={geocodeAddress} queryClient={queryClient} toast={toast} />
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
                    <option value="nature">🌿 Nature</option>
                    <option value="sport">⚽ Sport</option>
                    <option value="creatif">🎨 Créatif</option>
                    <option value="culture">🏛️ Culture</option>
                    <option value="jeux">🎲 Jeux</option>
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
                  <Toggle label="Chaise haute / réhausseur" checked={form.high_chair} onChange={(v) => updateForm('high_chair', v)} />
                  <Toggle label="Table à langer" checked={form.changing_table} onChange={(v) => updateForm('changing_table', v)} />
                  <Toggle label="Espace jeux" checked={form.kids_area} onChange={(v) => updateForm('kids_area', v)} />
                  <Toggle label="🍽️ Menu enfant" checked={form.kids_menu} onChange={(v) => updateForm('kids_menu', v)} />
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

                {(form.category === 'restaurant' || form.category === 'cafe') && (
                  <MealsEditor mealTypes={mealTypes} state={addMeals} onChange={setAddMeals} />
                )}

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
                  <option value="nature">🌿 Nature</option>
                  <option value="sport">⚽ Sport</option>
                  <option value="creatif">🎨 Créatif</option>
                  <option value="culture">🏛️ Culture</option>
                  <option value="jeux">🎲 Jeux</option>
                </select>
              </div>
              <FormField label="Adresse" value={editForm.address} onChange={(v) => setEditForm((f: any) => ({ ...f, address: v }))} />
              <div style={{ marginTop: -8, marginBottom: 4, fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>📍 {editOriginalLat != null && editOriginalLng != null ? `${editOriginalLat.toFixed(5)}, ${editOriginalLng.toFixed(5)}` : 'Aucune coordonnée'}</span>
                {editForm.address !== editOriginalAddress && (
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>· adresse modifiée → re-géocodage à l'enregistrement</span>
                )}
                <button
                  type="button"
                  onClick={() => setShowEditManualCoords((s) => !s)}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--secondary)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, textDecoration: 'underline' }}
                >
                  {showEditManualCoords ? 'Masquer' : 'Modifier manuellement les coordonnées'}
                </button>
              </div>
              {showEditManualCoords && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Latitude</label>
                    <input value={editManualLat} onChange={(e) => setEditManualLat(e.target.value)} placeholder="47.2184" style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 15 }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Longitude</label>
                    <input value={editManualLng} onChange={(e) => setEditManualLng(e.target.value)} placeholder="-1.5536" style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 15 }} />
                  </div>
                </div>
              )}
              <FormField label="Site web" value={editForm.website} onChange={(v) => setEditForm((f: any) => ({ ...f, website: v }))} placeholder="https://..." />
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Instagram</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '15px' }}>@</span>
                  <input value={editForm.instagram} onChange={(e) => setEditForm((f: any) => ({ ...f, instagram: e.target.value }))} placeholder="compte_instagram" style={{ width: '100%', padding: '13px 16px 13px 30px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: '15px' }} />
                </div>
              </div>
              <PhotoUpload
                currentUrl={editForm.photo || null}
                file={editPhotoFile}
                onFileChange={setEditPhotoFile}
                urlValue={editForm.photo}
                onUrlChange={(v) => setEditForm((f: any) => ({ ...f, photo: v }))}
              />
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
                <Toggle label="Chaise haute / réhausseur" checked={editForm.high_chair} onChange={(v) => setEditForm((f: any) => ({ ...f, high_chair: v }))} />
                <Toggle label="Table à langer" checked={editForm.changing_table} onChange={(v) => setEditForm((f: any) => ({ ...f, changing_table: v }))} />
                <Toggle label="Espace jeux" checked={editForm.kids_area} onChange={(v) => setEditForm((f: any) => ({ ...f, kids_area: v }))} />
                <Toggle label="🍽️ Menu enfant" checked={!!editForm.kids_menu} onChange={(v) => setEditForm((f: any) => ({ ...f, kids_menu: v }))} />
              </div>
              <div>
                <label style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Âge conseillé (optionnel)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number" min={0} max={99} inputMode="numeric"
                    value={editForm.age_min ?? ''}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, age_min: e.target.value.replace(/[^\d]/g, '') }))}
                    placeholder="Dès X ans"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                  />
                  <input
                    type="number" min={0} max={99} inputMode="numeric"
                    value={editForm.age_max ?? ''}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, age_max: e.target.value.replace(/[^\d]/g, '') }))}
                    placeholder="Jusqu'à Y ans"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
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

              {(editForm.category === 'restaurant' || editForm.category === 'cafe') && (
                <MealsEditor mealTypes={mealTypes} state={editMeals} onChange={setEditMeals} />
              )}

              <button
                onClick={async () => {
                  // Upload new photo if user selected a file
                  let finalPhotoUrl: string | null = editForm.photo || null;
                  if (editPhotoFile) {
                    const ext = editPhotoFile.name.split('.').pop() || 'jpg';
                    const path = `${editingId}/${Date.now()}.${ext}`;
                    const { error: upErr } = await supabase.storage
                      .from('location-photos')
                      .upload(path, editPhotoFile, { contentType: editPhotoFile.type });
                    if (upErr) {
                      toast({ title: "Erreur lors de l'upload, réessaie", variant: 'destructive' });
                      return;
                    }
                    const { data: urlData } = supabase.storage
                      .from('location-photos')
                      .getPublicUrl(path);
                    const newUrl = urlData.publicUrl;

                    // Delete previous photo if it lives in our bucket
                    const prev: string | null = editForm.photo || null;
                    if (prev && prev.includes('/location-photos/')) {
                      const oldPath = prev.split('/location-photos/')[1]?.split('?')[0];
                      if (oldPath) {
                        await supabase.storage.from('location-photos').remove([oldPath]);
                      }
                    }
                    finalPhotoUrl = newUrl;
                  }

                  // Resolve coordinates: manual override > re-geocode (if address changed) > keep originals
                  let newLat: number | null = null;
                  let newLng: number | null = null;
                  const addressChanged = editForm.address.trim() !== editOriginalAddress.trim();

                  if (showEditManualCoords) {
                    const la = parseFloat(editManualLat);
                    const ln = parseFloat(editManualLng);
                    if (!isFinite(la) || !isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
                      toast({ title: 'Coordonnées invalides', description: 'Vérifie latitude et longitude.', variant: 'destructive' });
                      return;
                    }
                    newLat = la;
                    newLng = ln;
                  } else if (addressChanged) {
                    setEditGeocoding(true);
                    const coords = await geocodeAddress(editForm.address);
                    setEditGeocoding(false);
                    if (!coords) {
                      toast({
                        title: 'Adresse introuvable',
                        description: 'Saisis les coordonnées manuellement (lien sous le champ adresse).',
                        variant: 'destructive',
                      });
                      setShowEditManualCoords(true);
                      return;
                    }
                    newLat = coords.lat;
                    newLng = coords.lng;
                  }

                  const updatePayload: any = {
                    name: editForm.name,
                    category: editForm.category,
                    address: editForm.address,
                    website: editForm.website || null,
                    instagram: editForm.instagram || null,
                    photo: finalPhotoUrl,
                    note: editForm.note || null,
                    high_chair: editForm.high_chair,
                    changing_table: editForm.changing_table,
                    kids_area: editForm.kids_area,
                    kids_menu: !!editForm.kids_menu,
                    bookable: editForm.bookable,
                    status: editForm.status,
                    age_min: (editForm.age_min ?? '').toString().trim() === '' ? null : Math.max(0, parseInt(editForm.age_min, 10)) || null,
                    age_max: (editForm.age_max ?? '').toString().trim() === '' ? null : Math.max(0, parseInt(editForm.age_max, 10)) || null,
                  };
                  if (newLat != null && newLng != null) {
                    updatePayload.lat = newLat;
                    updatePayload.lng = newLng;
                  }

                  const { error } = await supabase
                    .from('locations')
                    .update(updatePayload)
                    .eq('id', editingId);
                  if (error) {
                    toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
                    return;
                  }

                  // Persist meals only if category supports meals; otherwise wipe any existing meals
                  const supportsMeals = editForm.category === 'restaurant' || editForm.category === 'cafe';
                  if (supportsMeals) {
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
                  }

                  queryClient.invalidateQueries({ queryKey: ['all-locations'] });
                  queryClient.invalidateQueries({ queryKey: ['locations'] });
                  queryClient.invalidateQueries({ queryKey: ['location', editingId] });
                  queryClient.invalidateQueries({ queryKey: ['location_meals'] });
                  setEditingId(null);
                  setEditPhotoFile(null);
                  toast({ title: 'Lieu mis à jour ✓' });
                }}
                disabled={editGeocoding}
                style={{ width: '100%', padding: '14px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#fff', fontFamily: 'DM Sans', fontSize: '15px', fontWeight: 600, cursor: editGeocoding ? 'wait' : 'pointer', marginTop: '8px', opacity: editGeocoding ? 0.6 : 1 }}
              >
                {editGeocoding ? 'Géocodage…' : 'Enregistrer'}
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

const ACQUISITION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  social: { label: 'Réseaux sociaux', emoji: '📱', color: '#D95F3B' },
  word_of_mouth: { label: 'Bouche à oreille', emoji: '💬', color: '#3B7D6E' },
  partner_place: { label: 'Un lieu partenaire', emoji: '📍', color: '#E8A838' },
  search: { label: 'Recherche web / App Store', emoji: '🔎', color: '#5B8DEF' },
  press: { label: 'Presse ou blog', emoji: '📰', color: '#8B5CF6' },
  other: { label: 'Autre', emoji: '✨', color: '#9CA3AF' },
};

function AcquisitionChart({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  if (total === 0) {
    return (
      <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
        Pas encore de réponses 😴
      </div>
    );
  }
  const entries = Object.entries(distribution)
    .map(([key, count]) => ({ key, count, meta: ACQUISITION_LABELS[key] ?? { label: key, emoji: '❓', color: '#9CA3AF' } }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(...entries.map((e) => e.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {entries.map((e) => {
        const pct = Math.round((e.count / total) * 100);
        return (
          <div key={e.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                <span style={{ marginRight: 6 }}>{e.meta.emoji}</span>
                {e.meta.label}
              </span>
              <span style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {e.count} ({pct}%)
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max((e.count / max) * 100, 4)}%`,
                  height: '100%',
                  background: e.meta.color,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopList({
  title,
  entries,
  emails,
  approvedLabel,
}: {
  title: string;
  entries: { user_id: string; total: number; approved: number }[];
  emails: Record<string, string>;
  approvedLabel: string;
}) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '10px' }}>
        {title}
      </div>
      {entries.length === 0 ? (
        <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>
          Aucune donnée
        </div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map((e, i) => (
            <li
              key={e.user_id}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'DM Sans', fontSize: '13px' }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22, height: 22, borderRadius: '50%',
                  background: i === 0 ? 'var(--primary)' : 'var(--bg)',
                  color: i === 0 ? 'white' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '12px',
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {emails[e.user_id] ?? '…'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>
                <strong style={{ color: 'var(--text)' }}>{e.total}</strong>{' '}
                <span>({e.approved} {approvedLabel})</span>
              </span>
            </li>
          ))}
        </ol>
      )}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data } = await supabase.from('location_proposals' as any).select('*').order('created_at', { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const proposalUserIds = useMemo(
    () => Array.from(new Set((proposals as any[]).map((p) => p.user_id).filter(Boolean))),
    [proposals]
  );
  const { data: proposalEmails = {} } = useUserEmails(proposalUserIds);

  const startEdit = (proposal: any) => {
    setEditingId(proposal.id);
    setEditPhotoFile(null);
    setEditDraft({
      name: proposal.name ?? '',
      category: proposal.category ?? 'restaurant',
      address: proposal.address ?? '',
      website: proposal.website ?? '',
      instagram: proposal.instagram ?? '',
      photo: proposal.photo ?? '',
      note: proposal.note ?? '',
      high_chair: !!proposal.high_chair,
      changing_table: !!proposal.changing_table,
      kids_area: !!proposal.kids_area,
      kids_menu: !!proposal.kids_menu,
      bookable: proposal.bookable ?? 'unknown',
    });
  };

  const handleEditAndApprove = async (proposal: any) => {
    if (!editDraft) return;
    if (!editDraft.name || !editDraft.address) {
      toast({ title: 'Erreur', description: 'Nom et adresse obligatoires', variant: 'destructive' });
      return;
    }
    setProcessingId(proposal.id);
    try {
      // Upload new photo if provided
      let photoUrl: string | null = editDraft.photo || null;
      if (editPhotoFile) {
        const ext = editPhotoFile.name.split('.').pop();
        const fileName = `admin/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('location-photos').upload(fileName, editPhotoFile);
        if (upErr) throw upErr;
        photoUrl = supabase.storage.from('location-photos').getPublicUrl(fileName).data.publicUrl;
      }

      const coords = await geocodeAddress(editDraft.address);
      if (!coords) {
        setManualCoordsProposal(proposal.id);
        toast({ title: 'Adresse non trouvée', description: 'Ajustez les coordonnées manuellement, puis utilisez "Approuver".', variant: 'destructive' });
        setProcessingId(null);
        return;
      }

      const insertData: any = {
        name: editDraft.name,
        category: editDraft.category,
        address: editDraft.address,
        lat: coords.lat,
        lng: coords.lng,
        high_chair: editDraft.high_chair,
        changing_table: editDraft.changing_table,
        kids_area: editDraft.kids_area,
        kids_menu: editDraft.kids_menu,
        photo: photoUrl,
        website: editDraft.website || null,
        instagram: editDraft.instagram || null,
        note: editDraft.note || null,
        age_min: (editDraft as any).age_min ?? null,
        age_max: (editDraft as any).age_max ?? null,
        status: 'published',
      };
      if (editDraft.category === 'restaurant' || editDraft.category === 'cafe') {
        insertData.bookable = editDraft.bookable;
      }

      const { data: insertedLocation, error: insErr } = await supabase
        .from('locations')
        .insert(insertData)
        .select('id')
        .single();
      if (insErr) throw insErr;

      // Carry meal_types from proposal metadata
      const proposalMealTypes: string[] = (proposal.metadata as any)?.meal_types ?? [];
      if (insertedLocation?.id && proposalMealTypes.length > 0) {
        const { data: mealTypesData } = await supabase
          .from('meal_types')
          .select('id, default_time_start, default_time_end')
          .in('id', proposalMealTypes);
        const defaultsById = new Map<string, { start: string | null; end: string | null }>(
          (mealTypesData ?? []).map((mt: any) => [mt.id, { start: mt.default_time_start, end: mt.default_time_end }])
        );
        const mealRows = proposalMealTypes.map((mid) => ({
          location_id: insertedLocation.id,
          meal_type_id: mid,
          time_open: defaultsById.get(mid)?.start ?? null,
          time_close: defaultsById.get(mid)?.end ?? null,
          is_confirmed: false,
          confirmed_count: 0,
          created_by: proposal.user_id ?? null,
        }));
        await supabase.from('location_meals').upsert(mealRows, { onConflict: 'location_id,meal_type_id' });
      }

      // Track admin edits diff for traceability
      const editedFields: string[] = [];
      ['name','category','address','website','instagram','note','high_chair','changing_table','kids_area','kids_menu','bookable','photo'].forEach((k) => {
        const before = (proposal as any)[k] ?? null;
        const after = (editDraft as any)[k] ?? null;
        if (JSON.stringify(before) !== JSON.stringify(after)) editedFields.push(k);
      });
      const newMetadata = {
        ...(proposal.metadata ?? {}),
        admin_edits: { edited_at: new Date().toISOString(), fields: editedFields },
      };

      const { error: upStatusErr } = await supabase
        .from('location_proposals' as any)
        .update({ status: 'approved', metadata: newMetadata })
        .eq('id', proposal.id);
      if (upStatusErr) throw upStatusErr;

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['all-locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Proposition modifiée & approuvée ✓', description: editedFields.length ? `Champs édités : ${editedFields.join(', ')}` : 'Aucune modification' });
      setEditingId(null);
      setEditDraft(null);
      setEditPhotoFile(null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Échec', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

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
        kids_menu: proposal.kids_menu ?? false,
        photo: proposal.photo ?? null,
        website: proposal.website ?? null,
        instagram: proposal.instagram ?? null,
        note: proposal.note ?? null,
        age_min: proposal.age_min ?? null,
        age_max: proposal.age_max ?? null,
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
              {proposal.high_chair && <span style={{ color: '#2E7D32' }}>🪑 Chaise haute / réhausseur</span>}
              {proposal.changing_table && <span style={{ color: '#2E7D32' }}>👶 Table à langer</span>}
              {proposal.kids_area && <span style={{ color: '#2E7D32' }}>🌳 Espace jeux</span>}
              {proposal.kids_menu && <span style={{ color: '#2E7D32' }}>🍽️ Menu enfant</span>}
            </div>
            {proposal.note && (
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '6px' }}>
                "{proposal.note}"
              </div>
            )}
            <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span>{new Date(proposal.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {proposal.user_id && proposalEmails[proposal.user_id] && (
                <a href={`mailto:${proposalEmails[proposal.user_id]}`} style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                  ✉ {proposalEmails[proposal.user_id]}
                </a>
              )}
            </div>
            {proposal.status === 'pending' && editingId === proposal.id && editDraft && (
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'Caveat', fontSize: 14, color: 'var(--text-muted)' }}>Édition avant approbation ✦</div>
                <FormField label="Nom *" value={editDraft.name} onChange={(v) => setEditDraft({ ...editDraft, name: v })} />
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Catégorie</label>
                  <select
                    value={editDraft.category}
                    onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 16 }}
                  >
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <FormField label="Adresse *" value={editDraft.address} onChange={(v) => setEditDraft({ ...editDraft, address: v })} />
                <FormField label="Site web" value={editDraft.website} onChange={(v) => setEditDraft({ ...editDraft, website: v })} />
                <FormField label="Instagram" value={editDraft.instagram} onChange={(v) => setEditDraft({ ...editDraft, instagram: v })} />
                <div>
                  <label style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Note / description</label>
                  <textarea
                    value={editDraft.note}
                    onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 16, resize: 'vertical' }}
                  />
                </div>
                <PhotoUpload
                  currentUrl={editDraft.photo || null}
                  file={editPhotoFile}
                  onFileChange={setEditPhotoFile}
                  onUrlChange={(u) => setEditDraft({ ...editDraft, photo: u })}
                  urlValue={editDraft.photo}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['high_chair', '🪑 Chaise haute / réhausseur'],
                    ['changing_table', '👶 Table à langer'],
                    ['kids_area', '🌳 Espace jeux'],
                    ['kids_menu', '🍽️ Menu enfant'],
                  ].map(([k, label]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={!!editDraft[k]}
                        onChange={(e) => setEditDraft({ ...editDraft, [k]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {(editDraft.category === 'restaurant' || editDraft.category === 'cafe') && (
                  <div>
                    <label style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Réservation</label>
                    <select
                      value={editDraft.bookable}
                      onChange={(e) => setEditDraft({ ...editDraft, bookable: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'DM Sans', fontSize: 16 }}
                    >
                      <option value="unknown">Inconnu</option>
                      <option value="yes">Oui</option>
                      <option value="no">Non</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAndApprove(proposal)}
                    disabled={isProcessing}
                    style={{ flex: 1, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 100, border: 'none', background: 'var(--secondary)', color: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}
                  >
                    {isProcessing ? 'En cours…' : '✓ Enregistrer & approuver'}
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditDraft(null); setEditPhotoFile(null); }}
                    disabled={isProcessing}
                    style={{ flex: 1, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 100, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {proposal.status === 'pending' && editingId !== proposal.id && (
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
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleApprove(proposal, manualCoordsProposal === proposal.id)}
                    disabled={isProcessing}
                    style={{
                      flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                      padding: '8px', borderRadius: '100px', border: 'none',
                      background: 'var(--secondary)', color: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    {isProcessing ? 'En cours…' : manualCoordsProposal === proposal.id ? '✓ Approuver (coords)' : '✓ Approuver'}
                  </button>
                  <button
                    onClick={() => startEdit(proposal)}
                    disabled={isProcessing}
                    style={{
                      flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
                      padding: '8px', borderRadius: '100px',
                      border: '1.5px solid var(--secondary)', background: 'transparent',
                      color: 'var(--secondary)', cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    ✏️ Modifier & approuver
                  </button>
                  <button
                    onClick={() => handleReject(proposal)}
                    disabled={isProcessing}
                    style={{
                      flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
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

function EventsTab({ geocodeAddress, queryClient, toast }: {
  geocodeAddress: (address: string) => Promise<{lat: number; lng: number} | null>;
  queryClient: any;
  toast: any;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'rejected'>('pending');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'sourcing'>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);
  const [manualCoordsFor, setManualCoordsFor] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('47.2184');
  const [manualLng, setManualLng] = useState('-1.5536');

  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data } = await supabase.from('events' as any).select('*').order('created_at', { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set((events as any[]).map((e) => e.user_id).filter(Boolean))),
    [events]
  );
  const { data: emails = {} } = useUserEmails(userIds);

  const startEdit = (ev: any) => {
    setEditingId(ev.id);
    setEditDraft({
      name: ev.name ?? '',
      category: ev.category ?? 'Spectacle',
      address: ev.address ?? '',
      date_start: ev.date_start ?? '',
      date_end: ev.date_end ?? '',
      time: ev.time ?? '',
      age_min: ev.age_min ?? '',
      age_max: ev.age_max ?? '',
      duration: ev.duration ?? '',
      weather: ev.weather ?? '',
      price: ev.price ?? '',
      website: ev.website ?? '',
      instagram: ev.instagram ?? '',
      photo: ev.photo ?? '',
      note: ev.note ?? '',
      lat: ev.lat,
      lng: ev.lng,
    });
  };

  const geocodeEditAddress = async () => {
    if (!editDraft?.address) return;
    setProcessingId(editingId);
    try {
      const coords = await geocodeAddress(editDraft.address);
      if (coords) {
        setEditDraft({ ...editDraft, lat: coords.lat, lng: coords.lng });
        toast({ title: 'Coordonnées trouvées ✓', description: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
      } else {
        toast({ title: 'Adresse non trouvée', variant: 'destructive' });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    setProcessingId(editingId);
    try {
      const update: any = {
        name: editDraft.name,
        category: editDraft.category,
        address: editDraft.address || null,
        date_start: editDraft.date_start,
        date_end: editDraft.date_end || null,
        time: editDraft.time || null,
        age_min: editDraft.age_min === '' ? null : Number(editDraft.age_min),
        age_max: editDraft.age_max === '' ? null : Number(editDraft.age_max),
        duration: editDraft.duration || null,
        weather: editDraft.weather || null,
        price: editDraft.price || null,
        website: editDraft.website || null,
        instagram: editDraft.instagram || null,
        photo: editDraft.photo || null,
        note: editDraft.note || null,
        lat: editDraft.lat ?? null,
        lng: editDraft.lng ?? null,
      };
      const { error } = await supabase.from('events' as any).update(update).eq('id', editingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Événement modifié ✓' });
      setEditingId(null);
      setEditDraft(null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (ev: any, useManual = false) => {
    setProcessingId(ev.id);
    try {
      let lat = ev.lat;
      let lng = ev.lng;
      if (useManual) {
        lat = parseFloat(manualLat);
        lng = parseFloat(manualLng);
      } else if ((lat == null || lng == null) && ev.address) {
        const coords = await geocodeAddress(ev.address);
        if (!coords) {
          setManualCoordsFor(ev.id);
          toast({ title: 'Adresse non trouvée', description: 'Ajustez les coordonnées manuellement.', variant: 'destructive' });
          setProcessingId(null);
          return;
        }
        lat = coords.lat;
        lng = coords.lng;
      }
      const { error } = await supabase.from('events' as any).update({ status: 'published', lat, lng }).eq('id', ev.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Événement publié ✓', description: ev.name });
      setManualCoordsFor(null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (ev: any) => {
    setProcessingId(ev.id);
    try {
      const { error } = await supabase.from('events' as any).update({ status: 'rejected' }).eq('id', ev.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Événement rejeté' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (ev: any) => {
    if (!confirm(`Supprimer définitivement "${ev.name}" ?`)) return;
    setProcessingId(ev.id);
    try {
      const { error } = await supabase.from('events' as any).delete().eq('id', ev.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Événement supprimé' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const BOT_SOURCING_EMAIL = 'bastien.boubat+event@gmail.com';
  const isSourcing = (ev: any) =>
    !ev.user_id || (ev.user_id && emails[ev.user_id] === BOT_SOURCING_EMAIL);

  const filtered = events.filter((ev: any) => {
    if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
    if (sourceFilter === 'user' && isSourcing(ev)) return false;
    if (sourceFilter === 'sourcing' && !isSourcing(ev)) return false;
    return matchSearch(search, ev.name, ev.address, ev.website);
  });

  const pillStyle = (active: boolean) => ({
    fontFamily: 'DM Sans',
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: '100px',
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    cursor: 'pointer',
  } as React.CSSProperties);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, adresse ou site web…" />

      <div className="flex flex-wrap gap-2">
        {(['pending', 'published', 'rejected', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={pillStyle(statusFilter === s)}>
            {s === 'pending' ? 'À valider' : s === 'published' ? 'Publiés' : s === 'rejected' ? 'Rejetés' : 'Tous'}
          </button>
        ))}
        <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
        {(['all', 'user', 'sourcing'] as const).map((s) => (
          <button key={s} onClick={() => setSourceFilter(s)} style={pillStyle(sourceFilter === s)}>
            {s === 'all' ? 'Toutes provenances' : s === 'user' ? '👤 Utilisateurs' : '📰 Sourcing'}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }}>
        {filtered.length} {filtered.length > 1 ? 'événements affichés' : 'événement affiché'}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
          Aucun événement
        </p>
      )}

      {filtered.map((ev: any, i: number) => {
        const isProcessing = processingId === ev.id;
        const isEditing = editingId === ev.id;
        const catHex = eventCategoryHex(ev.category);
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '14px', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {ev.photo && (
                  <img src={ev.photo} alt={ev.name} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <span style={{ fontFamily: 'Fraunces', fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
                  {eventCategoryEmoji(ev.category)} {ev.name}
                </span>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '100px',
                  fontSize: '10px', fontWeight: 600, fontFamily: 'DM Sans',
                  background: catHex, color: 'white',
                }}>
                  {ev.category}
                </span>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '100px',
                  fontSize: '10px', fontWeight: 600, fontFamily: 'DM Sans',
                  background: !isSourcing(ev) ? '#E8F1FF' : '#F3E8FF',
                  color: !isSourcing(ev) ? '#1B4B8F' : '#6B2FA6',
                }}>
                  {!isSourcing(ev) ? '👤 Utilisateur' : '📰 Sourcing'}
                </span>
              </div>
              <StatusBadge status={ev.status === 'published' ? 'validated' : ev.status} />
            </div>

            {ev.address && (
              <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                📍 {ev.address}
                {ev.lat != null && ev.lng != null && (
                  <span style={{ marginLeft: 6, color: '#3B7D6E' }}>✓ géocodé</span>
                )}
              </div>
            )}
            <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              📅 {new Date(ev.date_start).toLocaleDateString('fr-FR')}
              {ev.date_end && ` → ${new Date(ev.date_end).toLocaleDateString('fr-FR')}`}
              {ev.time && ` · ⏰ ${ev.time}`}
            </div>
            <div className="flex gap-3 flex-wrap mb-2" style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--text-muted)' }}>
              {(ev.age_min != null || ev.age_max != null) && <span>👶 {ev.age_min ?? 0}-{ev.age_max ?? '∞'} ans</span>}
              {ev.duration && <span>⏱️ {ev.duration}</span>}
              {ev.weather && <span>🌤️ {ev.weather}</span>}
              {ev.price && <span>💶 {ev.price}</span>}
            </div>
            {ev.note && (
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '6px' }}>
                "{ev.note}"
              </div>
            )}
            <div style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {ev.user_id ? `Proposé par : ${emails[ev.user_id] ?? ev.user_id.slice(0, 8)}` : 'Sourcing interne'}
              {' · '}Créé le {new Date(ev.created_at).toLocaleDateString('fr-FR')}
            </div>

            {isEditing && editDraft && (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }}>
                <div className="flex flex-col gap-2">
                  <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    placeholder="Nom" style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  <select value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px', background: 'white' }}>
                    {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={editDraft.address} onChange={(e) => setEditDraft({ ...editDraft, address: e.target.value })}
                    placeholder="Adresse" style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  <div className="flex gap-2">
                    <input type="date" value={editDraft.date_start?.slice(0,10) ?? ''} onChange={(e) => setEditDraft({ ...editDraft, date_start: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                    <input type="date" value={editDraft.date_end?.slice(0,10) ?? ''} onChange={(e) => setEditDraft({ ...editDraft, date_end: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Heure" value={editDraft.time} onChange={(e) => setEditDraft({ ...editDraft, time: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                    <input placeholder="Durée" value={editDraft.duration} onChange={(e) => setEditDraft({ ...editDraft, duration: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Âge min" type="number" value={editDraft.age_min} onChange={(e) => setEditDraft({ ...editDraft, age_min: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                    <input placeholder="Âge max" type="number" value={editDraft.age_max} onChange={(e) => setEditDraft({ ...editDraft, age_max: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                    <input placeholder="Prix" value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  </div>
                  <select value={editDraft.weather ?? ''} onChange={(e) => setEditDraft({ ...editDraft, weather: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px', background: 'white' }}>
                    <option value="">Météo…</option>
                    {EVENT_WEATHERS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <input placeholder="Site web" value={editDraft.website} onChange={(e) => setEditDraft({ ...editDraft, website: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  <input placeholder="Instagram" value={editDraft.instagram} onChange={(e) => setEditDraft({ ...editDraft, instagram: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  <input placeholder="Photo URL" value={editDraft.photo} onChange={(e) => setEditDraft({ ...editDraft, photo: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                  <textarea placeholder="Note" value={editDraft.note} onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px', minHeight: 60 }} />
                  <div className="flex gap-2 items-center">
                    <input placeholder="Latitude" value={editDraft.lat ?? ''} onChange={(e) => setEditDraft({ ...editDraft, lat: e.target.value === '' ? null : Number(e.target.value) })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                    <input placeholder="Longitude" value={editDraft.lng ?? ''} onChange={(e) => setEditDraft({ ...editDraft, lng: e.target.value === '' ? null : Number(e.target.value) })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px' }} />
                    <button onClick={geocodeEditAddress} disabled={isProcessing}
                      style={{ padding: '8px 12px', borderRadius: 100, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      🌍 Géocoder
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={isProcessing}
                      style={{ flex: 1, padding: '10px', borderRadius: 100, border: 'none', background: 'var(--primary)', color: 'white', fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      💾 Enregistrer
                    </button>
                    <button onClick={() => { setEditingId(null); setEditDraft(null); }}
                      style={{ flex: 1, padding: '10px', borderRadius: 100, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {manualCoordsFor === ev.id && (
              <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', border: '1px solid #F2C94C', marginBottom: 10 }}>
                <div style={{ fontFamily: 'Caveat', fontSize: 14, color: '#C49A35', marginBottom: 8 }}>
                  Adresse non reconnue — ajustez les coordonnées ✦
                </div>
                <div className="flex gap-2">
                  <input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Lat"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 13 }} />
                  <input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Lng"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 13 }} />
                  <button onClick={() => handleApprove(ev, true)} disabled={isProcessing}
                    style={{ padding: '8px 12px', borderRadius: 100, border: 'none', background: 'var(--primary)', color: 'white', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Publier
                  </button>
                </div>
              </div>
            )}

            {!isEditing && (
              <div className="flex gap-2 flex-wrap">
                {ev.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(ev)} disabled={isProcessing}
                      style={{ flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: 8, borderRadius: 100, border: 'none', background: '#3B7D6E', color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}>
                      ✓ Approuver
                    </button>
                    <button onClick={() => handleReject(ev)} disabled={isProcessing}
                      style={{ flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: 8, borderRadius: 100, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}>
                      ✗ Rejeter
                    </button>
                  </>
                )}
                <button onClick={() => startEdit(ev)} disabled={isProcessing}
                  style={{ flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: 8, borderRadius: 100, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}>
                  ✏️ Modifier
                </button>
                <button onClick={() => handleDelete(ev)} disabled={isProcessing}
                  style={{ flex: '1 1 30%', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: 8, borderRadius: 100, border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}>
                  🗑 Supprimer
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
