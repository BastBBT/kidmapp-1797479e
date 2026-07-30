import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CategoryGroup, LocationCategory, groupOf, isActivity } from '@/types/location';
import MapView from '@/components/MapView';
import LocationCard from '@/components/LocationCard';
import Header from '@/components/Header';
import CategoryFilter from '@/components/CategoryFilter';
import MealFilter from '@/components/MealFilter';
import AgeFilter from '@/components/AgeFilter';
import ActivityFilter from '@/components/ActivityFilter';
import ActiveCategoryBanner from '@/components/ActiveCategoryBanner';

import { useLocations } from '@/hooks/useLocations';
import { useMealTypes, useAllLocationMeals } from '@/hooks/useMeals';
import { AgeBucket, matchesAgeBucket, ageAdequacyScore } from '@/lib/ageFilter';
import { matchesWeather, matchesDuration } from '@/lib/activity';


const MEAL_CATEGORIES = new Set(['restaurant', 'cafe']);
const VALID_CATEGORIES = new Set<string>([
  'all', 'restaurant', 'cafe', 'shop', 'public', 'coiffeur', 'librairie',
  'nature', 'sport', 'creatif', 'culture', 'jeux',
]);
const VALID_AGES = new Set<string>(['all', '0-2', '3-5', '6+']);
const VALID_GROUPS = new Set<string>(['places', 'activities']);

const NANTES_CENTER: [number, number] = [47.1984, -1.5536];
const DEFAULT_ZOOM = 12;

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  // Read initial values from URL once
  const initialCategory = (() => {
    const c = searchParams.get('category');
    return c && VALID_CATEGORIES.has(c) ? (c as LocationCategory | 'all') : 'all';
  })();
  const initialQuery = searchParams.get('q') ?? '';
  const initialMeal = searchParams.get('meal');
  const initialAge = (() => {
    const a = searchParams.get('age');
    return a && VALID_AGES.has(a) ? (a as AgeBucket) : 'all';
  })();
  // Le groupe suit la catégorie quand elle est précise ; sinon l'URL, sinon Lieux
  // (on n'atterrit jamais sur une liste mélangée lieux + activités).
  const initialGroup = (() => {
    if (initialCategory !== 'all') return groupOf(initialCategory);
    const g = searchParams.get('group');
    return g && VALID_GROUPS.has(g) ? (g as CategoryGroup) : 'places';
  })();
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
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup>(initialGroup);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(initialMeal);
  const [selectedAge, setSelectedAge] = useState<AgeBucket>(initialAge);
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const mapViewRef = useRef<{ center: [number, number]; zoom: number }>({ center: initialCenter, zoom: initialZoom });

  const { data: locations = [], isLoading } = useLocations(selectedCategory);
  // Catalogue complet publié, toujours en cache : sert la recherche, qui doit ignorer
  // les filtres. Même requête que ci-dessus (donc gratuite) quand aucune catégorie
  // précise n'est sélectionnée.
  const { data: allLocations = [] } = useLocations('all');
  const { data: mealTypes = [] } = useMealTypes();
  const { data: locationMeals = [] } = useAllLocationMeals();

  const showMealFilter = MEAL_CATEGORIES.has(selectedCategory);
  const showActivityFilter = isActivity(selectedCategory);

  // Reset meal filter when switching to a non-meal category
  useEffect(() => {
    if (!showMealFilter && selectedMeal !== null) {
      setSelectedMeal(null);
    }
  }, [showMealFilter, selectedMeal]);

  // Reset activity sub-filters when leaving an activity category
  useEffect(() => {
    if (!showActivityFilter) {
      if (selectedWeather !== null) setSelectedWeather(null);
      if (selectedDuration !== null) setSelectedDuration(null);
    }
  }, [showActivityFilter, selectedWeather, selectedDuration]);

  // Une catégorie précise appartient à un groupe : le segment suit la sélection.
  // (L'inverse n'est pas vrai — changer de groupe conserve la catégorie active,
  // signalée par le point sur l'autre segment.)
  useEffect(() => {
    if (selectedCategory !== 'all') {
      const g = groupOf(selectedCategory);
      setSelectedGroup((prev) => (prev === g ? prev : g));
    }
  }, [selectedCategory]);

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
    else if (selectedGroup !== 'places') params.set('group', selectedGroup);
    if (meal) params.set('meal', meal);
    if (selectedAge && selectedAge !== 'all') params.set('age', selectedAge);
    if (Number.isFinite(lat) && (lat !== NANTES_CENTER[0] || lng !== NANTES_CENTER[1])) {
      params.set('lat', lat.toFixed(4));
      params.set('lng', lng.toFixed(4));
    }
    if (Number.isFinite(zoom) && zoom !== DEFAULT_ZOOM) {
      params.set('zoom', String(zoom));
    }
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, selectedGroup, selectedMeal, selectedAge, setSearchParams]);

  // Push filter changes to URL
  useEffect(() => {
    updateUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, selectedGroup, selectedMeal, selectedAge]);

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

  const searchTerm = searchQuery.trim().toLowerCase();
  const isSearching = searchTerm !== '';

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

  const displayedLocations = useMemo(() => {
    // Recherche active : on balaie TOUT le catalogue publié en ignorant les filtres
    // (groupe, catégorie, âge, repas, météo, durée). Taper un nom doit le trouver,
    // qu'on soit sur Lieux ou sur Activités.
    if (isSearching) {
      return allLocations
        .filter(
          (loc) =>
            loc.name.toLowerCase().includes(searchTerm) ||
            loc.address?.toLowerCase().includes(searchTerm)
        )
        .sort(byName);
    }

    return locations
      .filter((loc) => {
        const matchCategory = selectedCategory === 'all' || loc.category === selectedCategory;
        // Sans catégorie précise, « Tout » reste borné au groupe actif : il n'existe
        // plus d'écran affichant lieux et activités mélangés.
        const matchGroup =
          selectedCategory !== 'all' ||
          isActivity(loc.category) === (selectedGroup === 'activities');
        const matchMeal = !locationIdsForMeal || locationIdsForMeal.has(loc.id);
        const matchAge = matchesAgeBucket(loc as any, selectedAge);
        const isActivityLoc = isActivity(loc.category);
        const matchWeather = !isActivityLoc || matchesWeather((loc as any).weather, selectedWeather);
        const matchDuration = !isActivityLoc || matchesDuration((loc as any).duration, selectedDuration);
        return matchCategory && matchGroup && matchMeal && matchAge && matchWeather && matchDuration;
      })
      .sort((a, b) => {
        if (selectedAge !== 'all') {
          const diff = ageAdequacyScore(b as any, selectedAge) - ageAdequacyScore(a as any, selectedAge);
          if (diff !== 0) return diff;
        }
        return byName(a, b);
      });
  }, [
    locations, allLocations, isSearching, searchTerm, selectedCategory, selectedGroup,
    locationIdsForMeal, selectedAge, selectedWeather, selectedDuration,
  ]);

  // Compteurs accordés au groupe actif — et neutres pendant une recherche, dont les
  // résultats croisent lieux et activités.
  const count = displayedLocations.length;
  const foundLabel = isSearching
    ? t('explore.results', { count })
    : selectedGroup === 'activities'
      ? t('explore.found_activities', { count })
      : t('explore.found_places', { count });
  const countLabel = isSearching
    ? t('explore.results', { count })
    : selectedGroup === 'activities'
      ? t('explore.count_activities', { count })
      : t('explore.count_places', { count });

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--bg)' }}>
      <Header
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        selectedAge={selectedAge}
        onAgeChange={setSelectedAge}
      />

      {/* Meal type filter (2nd row) — only for restaurant / cafe */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: showMealFilter ? 80 : 0,
          opacity: showMealFilter ? 1 : 0,
          transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
        }}
      >
        <MealFilter mealTypes={mealTypes} selected={selectedMeal} onChange={setSelectedMeal} />

      </div>

      {/* Activity filters (contextual) — only for activity categories */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: showActivityFilter ? 120 : 0,
          opacity: showActivityFilter ? 1 : 0,
          transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
        }}
      >
        <ActivityFilter
          weather={selectedWeather}
          duration={selectedDuration}
          onWeatherChange={setSelectedWeather}
          onDurationChange={setSelectedDuration}
        />
      </div>

      <ActiveCategoryBanner
        category={selectedCategory}
        onClear={() => setSelectedCategory('all')}
      />



      {/* Compteur */}
      <div style={{ padding: '12px 16px 8px' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {isLoading ? t('common.loading') : foundLabel}
          {activeMeal && (
            <span style={{ marginLeft: 4 }}>
              · {activeMeal.emoji} {activeMeal.label}
            </span>
          )}
        </p>
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
          locations={displayedLocations}
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
            {countLabel}
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
        {displayedLocations.map((loc, i) => {
          const mealIds = mealsByLocation.get(loc.id) ?? [];
          return <LocationCard key={loc.id} location={loc} index={i} mealIds={mealIds} ageBucket={selectedAge} />;
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
            <MapView
              locations={displayedLocations}
              selectedId={selectedId}
              initialCenter={mapViewRef.current.center}
              initialZoom={mapViewRef.current.zoom}
              onViewChange={handleMapViewChange}
            />
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
              <CategoryFilter
                selected={selectedCategory}
                onChange={setSelectedCategory}
                group={selectedGroup}
                onGroupChange={setSelectedGroup}
              />
              <div style={{ marginTop: 6 }}>
                <AgeFilter selected={selectedAge} onChange={setSelectedAge} />
              </div>
              <div
                style={{
                  overflow: 'hidden',
                  maxHeight: showMealFilter ? 80 : 0,
                  opacity: showMealFilter ? 1 : 0,
                  transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
                  marginTop: showMealFilter ? 6 : 0,
                }}
              >
                <MealFilter mealTypes={mealTypes} selected={selectedMeal} onChange={setSelectedMeal} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
