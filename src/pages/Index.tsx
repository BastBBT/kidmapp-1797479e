import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LocationCategory } from '@/types/location';
import MapView from '@/components/MapView';
import LocationCard from '@/components/LocationCard';
import Header from '@/components/Header';
import CategoryFilter from '@/components/CategoryFilter';
import MealFilter from '@/components/MealFilter';
import { useLocations } from '@/hooks/useLocations';
import { useMealTypes, useAllLocationMeals } from '@/hooks/useMeals';
import ProposeLocationModal from '@/components/ProposeLocationModal';

const MEAL_CATEGORIES = new Set(['all', 'restaurant', 'cafe']);
const VALID_CATEGORIES = new Set<string>(['all', 'restaurant', 'cafe', 'shop', 'public', 'coiffeur']);
const NANTES_CENTER: [number, number] = [47.1984, -1.5536];
const DEFAULT_ZOOM = 12;

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial values from URL once
  const initialCategory = (() => {
    const c = searchParams.get('category');
    return c && VALID_CATEGORIES.has(c) ? (c as LocationCategory | 'all') : 'all';
  })();
  const initialQuery = searchParams.get('q') ?? '';
  const initialMeal = searchParams.get('meal');
  const initialCenter = useMemo<[number, number]>(() => {
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : NANTES_CENTER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const initialZoom = useMemo<number>(() => {
    const z = parseFloat(searchParams.get('zoom') ?? '');
    return Number.isFinite(z) ? z : DEFAULT_ZOOM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | 'all'>(initialCategory);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(initialMeal);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const mapViewRef = useRef<{ center: [number, number]; zoom: number }>({ center: initialCenter, zoom: initialZoom });

  const { data: locations = [], isLoading } = useLocations(selectedCategory);
  const { data: mealTypes = [] } = useMealTypes();
  const { data: locationMeals = [] } = useAllLocationMeals();

  const showMealFilter = MEAL_CATEGORIES.has(selectedCategory);

  // Reset meal filter when switching to a non-meal category
  useEffect(() => {
    if (!showMealFilter && selectedMeal !== null) {
      setSelectedMeal(null);
    }
  }, [showMealFilter, selectedMeal]);

  // Sync URL params (replaceState — no history pollution)
  const updateUrl = useCallback((overrides: Partial<{ q: string; category: string; meal: string | null; lat: number; lng: number; zoom: number }> = {}) => {
    const params = new URLSearchParams();
    const q = overrides.q ?? searchQuery;
    const category = overrides.category ?? selectedCategory;
    const meal = overrides.meal !== undefined ? overrides.meal : selectedMeal;
    const lat = overrides.lat ?? mapViewRef.current.center[0];
    const lng = overrides.lng ?? mapViewRef.current.center[1];
    const zoom = overrides.zoom ?? mapViewRef.current.zoom;

    if (q) params.set('q', q);
    if (category && category !== 'all') params.set('category', category);
    if (meal) params.set('meal', meal);
    if (Number.isFinite(lat) && (lat !== NANTES_CENTER[0] || lng !== NANTES_CENTER[1])) {
      params.set('lat', lat.toFixed(4));
      params.set('lng', lng.toFixed(4));
    }
    if (Number.isFinite(zoom) && zoom !== DEFAULT_ZOOM) {
      params.set('zoom', String(zoom));
    }
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, selectedMeal, setSearchParams]);

  // Push filter changes to URL
  useEffect(() => {
    updateUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, selectedMeal]);

  const handleMapViewChange = useCallback((center: [number, number], zoom: number) => {
    mapViewRef.current = { center, zoom };
    updateUrl({ lat: center[0], lng: center[1], zoom });
  }, [updateUrl]);

  // Map: locationId -> meal_type_ids[]
  const mealsByLocation = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const lm of locationMeals) {
      const arr = map.get(lm.location_id) ?? [];
      arr.push(lm.meal_type_id);
      map.set(lm.location_id, arr);
    }
    return map;
  }, [locationMeals]);

  // Set of location ids matching the selected meal filter
  const locationIdsForMeal = useMemo(() => {
    if (!selectedMeal) return null;
    return new Set(
      locationMeals.filter((lm) => lm.meal_type_id === selectedMeal).map((lm) => lm.location_id)
    );
  }, [locationMeals, selectedMeal]);

  const activeMeal = mealTypes.find((m) => m.id === selectedMeal) || null;

  const filteredLocations = locations.filter((loc) => {
    const matchCategory = !selectedCategory || selectedCategory === 'all' || loc.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMeal = !locationIdsForMeal || locationIdsForMeal.has(loc.id);
    return matchCategory && matchSearch && matchMeal;
  });

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--bg)' }}>
      <Header
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Meal type filter (2nd row) — only for restaurant / cafe / all */}
      {showMealFilter && (
        <MealFilter mealTypes={mealTypes} selected={selectedMeal} onChange={setSelectedMeal} />
      )}

      {/* Compteur + Proposer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {isLoading
            ? 'Chargement…'
            : `${filteredLocations.length} lieu${filteredLocations.length > 1 ? 'x' : ''} trouvé${filteredLocations.length > 1 ? 's' : ''}`}
          {activeMeal && (
            <span style={{ marginLeft: 4 }}>
              · {activeMeal.emoji} {activeMeal.label}
            </span>
          )}
        </p>
        <button
          onClick={() => setShowProposalModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '100px',
            border: '1.5px solid var(--primary)',
            background: 'transparent', color: 'var(--primary)',
            fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Proposer un lieu
        </button>
      </div>

      {/* Carte compacte — isolation crée un nouveau contexte d'empilement */}
      <div style={{
        margin: '0 16px 8px',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        height: '200px',
        position: 'relative',
        flexShrink: 0,
        isolation: 'isolate',
        zIndex: 0,
      }}>
        <MapView
          locations={filteredLocations}
          selectedId={selectedId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          onViewChange={handleMapViewChange}
        />
        <button
          onClick={() => setMapExpanded(true)}
          style={{
            position: 'absolute',
            bottom: '10px', right: '10px',
            background: 'white',
            border: 'none',
            borderRadius: '100px',
            padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '12px', fontWeight: 600,
            fontFamily: 'DM Sans',
            color: 'var(--text)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            zIndex: 500,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          Agrandir
        </button>
      </div>

      {/* Section titre grille */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '12px 0 8px',
        }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em' }}>
            À découvrir
          </div>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', color: 'var(--text-muted)' }}>
            {filteredLocations.length} lieux
          </div>
        </div>
      </div>

      {/* Grille de lieux */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '0 16px 120px',
      }}>
        {filteredLocations.map((loc, i) => {
          const mealIds = mealsByLocation.get(loc.id) ?? [];
          const mealEmojis = mealIds
            .map((id) => mealTypes.find((m) => m.id === id)?.emoji)
            .filter((e): e is string => Boolean(e))
            .slice(0, 3);
          return <LocationCard key={loc.id} location={loc} index={i} mealEmojis={mealEmojis} />;
        })}
      </div>

      {/* Mode carte plein écran */}
      {mapExpanded && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 900,
          background: 'var(--bg)',
          isolation: 'isolate',
        }}>
          <div style={{ height: '100vh', width: '100%', position: 'relative', zIndex: 0 }}>
            <MapView locations={filteredLocations} selectedId={selectedId} />
          </div>
          <button
            onClick={() => setMapExpanded(false)}
            style={{
              position: 'absolute',
              top: '52px', left: '16px',
              background: 'white',
              border: 'none',
              borderRadius: '100px',
              padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 600,
              fontFamily: 'DM Sans',
              color: 'var(--text)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              zIndex: 910,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 21 3 21 3 15"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
            </svg>
            Réduire
          </button>
          <div style={{
            position: 'absolute',
            bottom: '100px', left: 0, right: 0,
            padding: '0 16px',
            zIndex: 910,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 'var(--radius)',
              padding: '10px 12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}>
              <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
            </div>
          </div>
        </div>
      )}

      <ProposeLocationModal open={showProposalModal} onClose={() => setShowProposalModal(false)} />
    </div>
  );
};

export default Index;
