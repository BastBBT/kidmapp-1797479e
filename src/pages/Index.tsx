import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronsUpDown, List, Map as MapIcon, Search } from 'lucide-react';
import { CategoryGroup, LocationCategory, groupOf } from '@/types/location';
import MapView from '@/components/MapView';
import LocationCard from '@/components/LocationCard';
import Header from '@/components/Header';
import CategoryFilter from '@/components/CategoryFilter';
import ExploreFiltersSheet from '@/components/ExploreFiltersSheet';
import { FilterChip, FiltersButton } from '@/components/FilterParts';
import { segmentStyle } from '@/lib/segmentStyle';
import { MascotteMiniature } from '@/components/Mascotte';
import { useCoachmarks, useCoachmarkTarget } from '@/hooks/useCoachmarks';
import { parseOpeningHours } from '@/lib/openingHours';
import { useProximityZone } from '@/hooks/useProximityZone';
import { locationFarInfo } from '@/lib/proximity';
import Assistant, { AssistantOutcome } from '@/components/Assistant';
import { useLocations } from '@/hooks/useLocations';
import { useMealTypes, useAllLocationMeals } from '@/hooks/useMeals';
import { AGE_LABEL_KEY, AgeBucket, ChildAgeBucket, ageAdequacyScoreForBuckets, bucketForChildMonths } from '@/lib/ageFilter';
import { useChildren } from '@/hooks/useChildren';
import { Child, ageInMonths } from '@/lib/children';
import AgeBandCelebrationCard from '@/components/AgeBandCelebrationCard';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { translateToken } from '@/i18n/tokenMaps';
import { ExploreCriteria, ExploreLoc, countExplore, inGroup, matchesExplore, weatherLabelKey } from '@/lib/exploreFilters';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Ordre d'affichage de la liste. `default` = ordre historique : alphabétique,
 *  ou classé par adéquation d'âge quand un filtre d'âge est actif. */
type SortMode = 'default' | 'loved' | 'recent';

const VALID_CATEGORIES = new Set<string>([
  'all', 'restaurant', 'cafe', 'shop', 'public', 'coiffeur', 'librairie',
  'nature', 'sport', 'creatif', 'culture', 'jeux',
]);
const VALID_AGES = new Set<string>(['all', '0-2', '3-5', '6+']);
const VALID_GROUPS = new Set<string>(['places', 'activities']);
const AGE_BAND_KEY = 'explore.ageBand';
const SHOW_MAP_KEY = 'explore.showMap';

const NANTES_CENTER: [number, number] = [47.1984, -1.5536];
const DEFAULT_ZOOM = 12;

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : le réglage reste pour la session.
  }
};

/**
 * Onglet Explorer : Lieux · Activités, les catégories du groupe, une seule
 * rangée de filtres (le reste dans le panneau Filtres), puis la grille. Miroir
 * d'`ExploreView.swift` (iOS) et `explore_screen.dart` (Android).
 */
const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categoriesTargetRef = useCoachmarkTarget('categories');
  const { wantsLocationDetail, locationDetailRequestHandled, locationDetailUnavailable } = useCoachmarks();

  // L'URL fait foi (lien partagé/rechargé) ; à défaut, la dernière tranche
  // choisie survit à la fermeture de l'onglet via localStorage.
  const initialCategory = (() => {
    const c = searchParams.get('category');
    return c && VALID_CATEGORIES.has(c) ? (c as LocationCategory | 'all') : 'all';
  })();
  const initialAge = (() => {
    const a = searchParams.get('age');
    if (a && VALID_AGES.has(a)) return a as AgeBucket;
    const stored = readStorage(AGE_BAND_KEY);
    return stored && VALID_AGES.has(stored) ? (stored as AgeBucket) : 'all';
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

  const [group, setGroupState] = useState<CategoryGroup>(initialGroup);
  const [category, setCategory] = useState<LocationCategory | 'all'>(initialCategory);
  const [mealId, setMealId] = useState<string | null>(searchParams.get('meal'));
  const [weather, setWeather] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  // La recherche remplace l'en-tête le temps qu'on tape : elle ignore les
  // filtres, les afficher en dessous laisserait croire le contraire.
  const [searchActive, setSearchActive] = useState(() => (searchParams.get('q') ?? '') !== '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // La carte n'occupe plus l'écran en permanence : elle s'affiche à la demande,
  // et ce choix est retenu d'une session à l'autre (comme sur Sorties).
  const [showMap, setShowMapState] = useState(() => readStorage(SHOW_MAP_KEY) === '1');
  const setShowMap = (v: boolean) => {
    setShowMapState(v);
    writeStorage(SHOW_MAP_KEY, v ? '1' : '0');
  };
  const mapViewRef = useRef<{ center: [number, number]; zoom: number }>({ center: initialCenter, zoom: initialZoom });

  // Changer de groupe efface ce qui n'a de sens que dans l'autre : une catégorie,
  // un repas, une météo ou une durée cachés seraient des filtres qu'on ne voit
  // plus et qu'on ne peut plus retirer.
  const selectGroup = (g: CategoryGroup) => {
    if (g === group) return;
    setGroupState(g);
    setCategory('all');
    setMealId(null);
    setOnlyFree(false);
    setWeather(null);
    setDuration(null);
  };

  const {
    children: kids, selection: childSelection, setSelection: setChildSelection,
    resolvedBuckets, requestHookIfNeeded, ageBandCrossing, acknowledgeAgeBandCrossing,
  } = useChildren();
  const { settings: profileSettings } = useProfileSettings();
  // D7 : dès qu'un canal digest est actif, la célébration partira par ce
  // canal — la carte in-app n'est que le repli du canal « aucun ». Attendre
  // que les réglages soient chargés évite de l'afficher une fraction de seconde.
  const showAgeBandCelebration =
    ageBandCrossing !== null && profileSettings !== null &&
    !profileSettings.digestEmailEnabled && !profileSettings.digestPushEnabled;

  const [selectedAge, setSelectedAge] = useState<AgeBucket>(initialAge);
  const ageBucket = selectedAge === 'all' ? null : (selectedAge as ChildAgeBucket);
  // Choisir une vraie tranche alors qu'aucun enfant n'est enregistré, c'est le
  // moment où la proposition d'en enregistrer a du sens. Le filtre s'applique
  // immédiatement : la feuille ne conditionne rien.
  const setAgeBucket = (b: ChildAgeBucket | null, offerHook = true) => {
    setSelectedAge(b ?? 'all');
    if (b && offerHook) requestHookIfNeeded();
  };
  // Dès qu'au moins un enfant est enregistré, la sélection enfant (union de
  // tranches) remplace la tranche générique.
  const ageBuckets = useMemo<Set<ChildAgeBucket>>(
    () => (kids.length > 0 ? resolvedBuckets : ageBucket ? new Set([ageBucket]) : new Set()),
    [kids.length, resolvedBuckets, ageBucket],
  );

  // Instant de référence du filtre « Ouvert » : relu à chaque bascule puis chaque
  // minute tant qu'il est actif, sinon un onglet laissé ouvert garderait un
  // verdict périmé.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!onlyOpen) return;
    setNowTick(Date.now());
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [onlyOpen]);

  const zone = useProximityZone();
  // Catalogue complet publié : tous les filtres s'appliquent côté client, ce qui
  // permet d'annoncer pour chaque option le nombre de lieux qu'elle donnerait.
  const { data: locations = [], isLoading } = useLocations('all');
  const { data: mealTypes = [] } = useMealTypes();
  const { data: locationMeals = [] } = useAllLocationMeals();

  const mealIndex = useMemo(() => {
    const byMeal = new Map<string, Set<string>>();
    for (const lm of locationMeals) {
      if (!byMeal.has(lm.meal_type_id)) byMeal.set(lm.meal_type_id, new Set());
      byMeal.get(lm.meal_type_id)!.add(lm.location_id);
    }
    return byMeal;
  }, [locationMeals]);

  const ctx = useMemo(
    () => ({
      now: new Date(nowTick),
      mealLocationIds: (id: string) => mealIndex.get(id) ?? new Set<string>(),
      isNear: (loc: ExploreLoc) => locationFarInfo(zone, loc) === null,
    }),
    [nowTick, mealIndex, zone],
  );

  const criteria = useMemo<ExploreCriteria>(
    () => ({ group, category, ageBuckets, onlyOpen, onlyNearby, mealId, onlyFree, weather, duration }),
    [group, category, ageBuckets, onlyOpen, onlyNearby, mealId, onlyFree, weather, duration],
  );
  const count = useCallback((c: ExploreCriteria) => countExplore(locations, c, ctx), [locations, ctx]);

  const searchTerm = searchQuery.trim().toLowerCase();
  const isSearching = searchTerm !== '';

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

  const displayedLocations = useMemo(() => {
    // Recherche active : on balaie TOUT le catalogue publié en ignorant les filtres.
    // Taper un nom doit le trouver, qu'on soit sur Lieux ou sur Activités.
    if (isSearching) {
      return locations
        .filter(
          (loc) =>
            loc.name.toLowerCase().includes(searchTerm) ||
            loc.address?.toLowerCase().includes(searchTerm) ||
            loc.note?.toLowerCase().includes(searchTerm),
        )
        .sort(byName);
    }

    // Les filtres réduisent le jeu ; le tri choisi, lui, l'ordonne.
    const scoped = locations.filter((loc) => matchesExplore(loc, criteria, ctx));
    if (sortMode === 'loved') {
      // On restreint aux lieux ayant au moins un favori : trier les 200+ lieux à
      // zéro ne produirait qu'une queue arbitraire.
      return scoped
        .filter((loc) => (loc.favorites_count ?? 0) > 0)
        .sort((a, b) => (b.favorites_count ?? 0) - (a.favorites_count ?? 0) || byName(a, b));
    }
    if (sortMode === 'recent') {
      // `created_at` est un timestamptz ISO 8601 au format constant : la
      // comparaison lexicographique équivaut à la comparaison chronologique.
      return scoped.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || byName(a, b));
    }
    return scoped.sort((a, b) => {
      if (ageBuckets.size > 0) {
        const diff = ageAdequacyScoreForBuckets(b, ageBuckets) - ageAdequacyScoreForBuckets(a, ageBuckets);
        if (diff !== 0) return diff;
      }
      return byName(a, b);
    });
  }, [locations, isSearching, searchTerm, criteria, ctx, sortMode, ageBuckets]);

  // Pas d'ouverture automatique de l'assistant sur le web, contrairement à
  // iOS/Android : un popup qui se pousse tout seul freinerait un visiteur qui
  // arrive depuis Instagram. Il reste accessible via la pastille « Aidez-moi ».

  // Applique ce que l'assistant rapporte, sans effacement : c'est lui qui décide
  // du groupe et de ce qui l'accompagne.
  const handleAssistantOutcome = (outcome: AssistantOutcome) => {
    setGroupState(outcome.group);
    setCategory(outcome.category ?? 'all');
    if (outcome.childSelection) setChildSelection(outcome.childSelection);
    else if (outcome.ageBucket) setAgeBucket(outcome.ageBucket as ChildAgeBucket, false);
    setWeather(outcome.weather);
    setDuration(outcome.duration);
    setMealId(outcome.mealId);
    setOnlyOpen(outcome.onlyOpen);
    setOnlyFree(outcome.onlyFree);
    setShowMap(false);
    setAssistantOpen(false);
  };

  // Sync URL params (replaceState — pas de pollution de l'historique).
  const updateUrl = useCallback((overrides: Partial<{ lat: number; lng: number; zoom: number }> = {}) => {
    const params = new URLSearchParams();
    const lat = overrides.lat ?? mapViewRef.current.center[0];
    const lng = overrides.lng ?? mapViewRef.current.center[1];
    const zoom = overrides.zoom ?? mapViewRef.current.zoom;
    if (searchQuery) params.set('q', searchQuery);
    if (category !== 'all') params.set('category', category);
    else if (group !== 'places') params.set('group', group);
    if (mealId) params.set('meal', mealId);
    if (selectedAge !== 'all') params.set('age', selectedAge);
    if (Number.isFinite(lat) && (lat !== NANTES_CENTER[0] || lng !== NANTES_CENTER[1])) {
      params.set('lat', lat.toFixed(4));
      params.set('lng', lng.toFixed(4));
    }
    if (Number.isFinite(zoom) && zoom !== DEFAULT_ZOOM) params.set('zoom', String(zoom));
    setSearchParams(params, { replace: true });
  }, [searchQuery, category, group, mealId, selectedAge, setSearchParams]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  // Persistée : rouvrir l'app doit retrouver la dernière tranche choisie.
  useEffect(() => {
    writeStorage(AGE_BAND_KEY, selectedAge === 'all' ? null : selectedAge);
  }, [selectedAge]);

  // L'URL n'est réécrite qu'une fois le geste de carte terminé : chaque
  // `moveend` rendait sinon toute la page pendant que le doigt bouge.
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateUrlRef = useRef(updateUrl);
  updateUrlRef.current = updateUrl;
  useEffect(() => () => {
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
  }, []);
  const handleMapViewChange = useCallback((center: [number, number], zoom: number) => {
    mapViewRef.current = { center, zoom };
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
    urlSyncTimer.current = setTimeout(() => {
      updateUrlRef.current({ lat: center[0], lng: center[1], zoom });
    }, 500);
  }, []);

  // La bulle 3 se termine par « Voir une fiche → » : c'est ici qu'on désigne
  // laquelle. Sans lieu chargé, on arrête la visite plutôt que de la laisser en suspens.
  useEffect(() => {
    if (!wantsLocationDetail) return;
    locationDetailRequestHandled();
    const first = displayedLocations[0] ?? locations[0];
    if (!first) {
      locationDetailUnavailable();
      return;
    }
    navigate(`/location/${first.id}`);
  }, [wantsLocationDetail, locationDetailRequestHandled, locationDetailUnavailable, displayedLocations, locations, navigate]);

  const childLabel = (child: Child): string => {
    const name = child.first_name?.trim();
    const months = ageInMonths(child);
    if (!name) return t(AGE_LABEL_KEY[bucketForChildMonths(months)]);
    const age = months < 24 ? t('common.age_in_months', { age: months }) : t('common.age_in_years', { age: Math.round(months / 12) });
    return `${name} · ${age}`;
  };
  const isChildOn = (child: Child) =>
    childSelection.kind === 'allChildren' || (childSelection.kind === 'child' && childSelection.id === child.id);
  /**
   * Deux enfants : chaque pastille s'ajoute ou se retire (les deux = « Tous mes
   * enfants »). Au-delà, la sélection partagée ne sait dire qu'un enfant ou
   * tous : une pastille touchée devient la seule sélectionnée.
   */
  const toggleChild = (child: Child) => {
    if (childSelection.kind === 'none') return setChildSelection({ kind: 'child', id: child.id });
    if (childSelection.kind === 'child') {
      if (childSelection.id === child.id) return setChildSelection({ kind: 'none' });
      return setChildSelection(kids.length === 2 ? { kind: 'allChildren' } : { kind: 'child', id: child.id });
    }
    const other = kids.find((k) => k.id !== child.id);
    setChildSelection(kids.length === 2 && other ? { kind: 'child', id: other.id } : { kind: 'child', id: child.id });
  };

  // Filtres posés depuis le panneau (ou l'assistant), remontés dans la barre
  // avec leur croix pour qu'on les voie et qu'on les retire d'un clic.
  const extras: { id: string; label: string; remove: () => void }[] = [];
  if (onlyNearby) extras.push({ id: 'near', label: t('sorties.nearby'), remove: () => setOnlyNearby(false) });
  if (group === 'places' && mealId) {
    const meal = mealTypes.find((m) => m.id === mealId);
    extras.push({
      id: 'meal',
      label: meal ? `${meal.emoji} ${translateToken('meal', meal.short_label)}` : t('explore.meal_fallback'),
      remove: () => setMealId(null),
    });
  }
  if (group === 'activities') {
    if (onlyFree) extras.push({ id: 'free', label: t('sorties.free'), remove: () => setOnlyFree(false) });
    if (weather) extras.push({ id: 'weather', label: t(weatherLabelKey(weather)), remove: () => setWeather(null) });
    if (duration) extras.push({ id: 'duration', label: translateToken('duration', duration), remove: () => setDuration(null) });
  }
  // La catégorie n'en fait pas partie : elle se lit déjà dans sa propre rangée.
  const activeCount =
    (kids.length > 0 ? (childSelection.kind === 'none' ? 0 : 1) : ageBucket ? 1 : 0) + (onlyOpen ? 1 : 0) + extras.length;

  const clearAll = () => {
    if (kids.length > 0) setChildSelection({ kind: 'none' });
    else setAgeBucket(null);
    setOnlyOpen(false);
    setOnlyNearby(false);
    setMealId(null);
    setOnlyFree(false);
    setWeather(null);
    setDuration(null);
  };
  const applyPatch = (patch: Partial<ExploreCriteria>) => {
    if ('onlyOpen' in patch) setOnlyOpen(!!patch.onlyOpen);
    if ('onlyNearby' in patch) setOnlyNearby(!!patch.onlyNearby);
    if ('onlyFree' in patch) setOnlyFree(!!patch.onlyFree);
    if ('mealId' in patch) setMealId(patch.mealId ?? null);
    if ('weather' in patch) setWeather(patch.weather ?? null);
    if ('duration' in patch) setDuration(patch.duration ?? null);
  };

  const totalLabel = (n: number, g: CategoryGroup) =>
    t(g === 'activities' ? 'explore.total_activities' : 'explore.total_places', { count: n });
  const shown = displayedLocations.length;
  const forWhom = (() => {
    const names = kids.filter(isChildOn).map((k) => k.first_name?.trim()).filter((n): n is string => !!n);
    if (names.length === 1) return names[0];
    if (names.length === 2) return t('explore.names_and', { a: names[0], b: names[1] });
    return null;
  })();
  const summary = isSearching
    ? t('explore.results', { count: shown })
    : shown > 0 && forWhom
      ? t('explore.for_whom_summary', { count: totalLabel(shown, group), who: forWhom })
      : totalLabel(shown, group);
  const unknownHoursCount = onlyOpen && !isSearching
    ? displayedLocations.filter((loc) => !parseOpeningHours(loc.opening_hours)).length
    : 0;

  // Pour chaque filtre actif, ce qu'on obtiendrait en le retirant — puis l'autre
  // groupe avec les mêmes filtres communs. Seules les pistes non vides restent.
  // Pas mémoïsé : calculé seulement quand la liste est vide.
  const buildRelaxers = () => {
    const out: { id: string; label: string; countLabel: string; apply: () => void }[] = [];
    const add = (id: string, label: string, c: ExploreCriteria, apply: () => void) => {
      const n = count(c);
      if (n > 0) out.push({ id, label, countLabel: totalLabel(n, c.group), apply });
    };
    if (category !== 'all') add('cat', t('explore.relax_categories'), { ...criteria, category: 'all' }, () => setCategory('all'));
    if (ageBuckets.size) {
      add('age', t('sorties.relax_ages'), { ...criteria, ageBuckets: new Set() }, () =>
        kids.length > 0 ? setChildSelection({ kind: 'none' }) : setAgeBucket(null),
      );
    }
    if (onlyOpen) add('open', t('explore.relax_closed'), { ...criteria, onlyOpen: false }, () => setOnlyOpen(false));
    if (onlyNearby) add('near', t('sorties.relax_nearby'), { ...criteria, onlyNearby: false }, () => setOnlyNearby(false));
    if (group === 'places' && mealId) add('meal', t('explore.relax_meals'), { ...criteria, mealId: null }, () => setMealId(null));
    if (group === 'activities') {
      if (onlyFree) add('free', t('sorties.relax_free'), { ...criteria, onlyFree: false }, () => setOnlyFree(false));
      if (weather) add('weather', t('explore.relax_weather'), { ...criteria, weather: null }, () => setWeather(null));
      if (duration) add('duration', t('explore.relax_durations'), { ...criteria, duration: null }, () => setDuration(null));
    }
    const other: CategoryGroup = group === 'places' ? 'activities' : 'places';
    add('group', t(other === 'places' ? 'explore.relax_side_places' : 'explore.relax_side_activities'), inGroup(criteria, other), () => selectGroup(other));
    return out;
  };

  const stopSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--bg)' }}>
      <Header onOpenAssistant={() => setAssistantOpen(true)} />

      <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {searchActive ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="search"
                autoFocus
                aria-label={t('explore.search_label')}
                placeholder={t('common.search_place')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') stopSearch(); }}
                style={{
                  width: '100%', minHeight: 44, padding: '0 14px 0 34px', borderRadius: 12, outline: 'none',
                  border: '1.5px solid var(--secondary)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 15,
                }}
              />
            </div>
            <button
              type="button"
              onClick={stopSearch}
              style={{ minHeight: 44, padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--secondary)' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ flex: 1, minWidth: 0, fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🧭 {t('explore.title_nantes')}
              </h1>
              <button
                type="button"
                onClick={() => setSearchActive(true)}
                aria-label={t('explore.search_label')}
                style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Search size={17} aria-hidden />
              </button>
            </div>

            <div ref={categoriesTargetRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Lieux · Activités, chacun avec son nombre pour les filtres communs aux deux. */}
              <div role="tablist" style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--border)', borderRadius: 999 }}>
                {(['places', 'activities'] as const).map((g) => {
                  const active = g === group;
                  return (
                    <button key={g} type="button" role="tab" aria-selected={active} onClick={() => selectGroup(g)} style={{ ...segmentStyle(active), minHeight: 36, fontSize: 14 }}>
                      {t(g === 'places' ? 'filters.places' : 'filters.activities')}
                      {!isLoading && (
                        <span style={{ marginLeft: 5, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{count(inGroup(criteria, g))}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <CategoryFilter selected={category} onChange={setCategory} group={group} />
            </div>

            {/* Une seule rangée : le bouton Filtres, les filtres qu'on touche le plus
                (enfants, Ouvert maintenant), puis chaque autre filtre actif avec sa croix. */}
            <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
              <FiltersButton label={t('sorties.filters')} count={activeCount} onClick={() => setFiltersOpen(true)} />
              {kids.length > 0
                ? kids.map((child) => (
                    <FilterChip key={child.id} label={childLabel(child)} on={isChildOn(child)} onClick={() => toggleChild(child)} removeLabel={t('sorties.remove_filter')} />
                  ))
                : ageBucket && (
                    <FilterChip label={t(AGE_LABEL_KEY[ageBucket])} on removable onClick={() => setAgeBucket(null)} removeLabel={t('sorties.remove_filter')} />
                  )}
              <FilterChip label={t('explore.open_now')} on={onlyOpen} onClick={() => setOnlyOpen((v) => !v)} removeLabel={t('sorties.remove_filter')} />
              {extras.map((e) => (
                <FilterChip key={e.id} label={e.label} on removable onClick={e.remove} removeLabel={t('sorties.remove_filter')} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Ligne du compteur : résumé, tri (même menu que Sorties, au même endroit), carte. */}
      <div style={{ marginTop: 10, padding: '6px 12px 6px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'Caveat', fontSize: 20, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isLoading ? t('common.loading') : summary}
        </span>
        {!isSearching && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1 text-sm font-medium shrink-0"
                style={{ minHeight: 36, padding: '0 6px', color: sortMode === 'default' ? 'var(--text-muted)' : 'var(--primary)' }}
                aria-label={t('explore.sort')}
              >
                {t(`explore.sort_${sortMode}`)}
                <ChevronsUpDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(['default', 'loved', 'recent'] as const).map((mode) => (
                <DropdownMenuItem key={mode} onSelect={() => setSortMode(mode)} className={sortMode === mode ? 'font-semibold' : undefined}>
                  {t(`explore.sort_${mode}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          aria-label={showMap ? t('sorties.show_list') : t('sorties.show_map')}
          style={{ width: 40, height: 36, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
        >
          {showMap ? <List size={16} aria-hidden /> : <MapIcon size={16} aria-hidden />}
        </button>
      </div>

      {showAgeBandCelebration && ageBandCrossing && (
        <div style={{ padding: '12px 16px 0' }}>
          <AgeBandCelebrationCard
            crossing={ageBandCrossing}
            onSeeMore={() => {
              setChildSelection({ kind: 'child', id: ageBandCrossing.child.id });
              acknowledgeAgeBandCrossing();
            }}
            onDismiss={acknowledgeAgeBandCrossing}
          />
        </div>
      )}

      {/* Un filtre honnête dit ce qu'il ne sait pas : ces lieux ne sont pas confirmés
          ouverts, juste pas écartés. */}
      {unknownHoursCount > 0 && (
        <p style={{ padding: '8px 16px 0', fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
          {t('explore.unknown_hours', { count: unknownHoursCount })}
        </p>
      )}

      {showMap && shown > 0 && (
        <div style={{ margin: '8px 16px 0', borderRadius: 'var(--radius)', overflow: 'hidden', height: 300, flexShrink: 0, isolation: 'isolate', zIndex: 0 }}>
          <MapView
            locations={displayedLocations}
            initialCenter={mapViewRef.current.center}
            initialZoom={mapViewRef.current.zoom}
            onViewChange={handleMapViewChange}
          />
        </div>
      )}

      {!isLoading && shown === 0 ? (
        <div style={{ padding: '22px 16px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <MascotteMiniature size={64} />
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>
            {isSearching ? t('explore.no_name_match') : t('sorties.nothing_title')}
          </p>
          {!isSearching && (
            <>
              <p style={{ fontFamily: 'Caveat', fontSize: 17, color: 'var(--text-muted)' }}>{t('sorties.nothing_hint')}</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {buildRelaxers().map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={r.apply}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, padding: '0 14px', cursor: 'pointer',
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                      fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: 'var(--text)', textAlign: 'left',
                    }}
                  >
                    {r.label}
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--secondary)', background: 'var(--secondary-light)', borderRadius: 999, padding: '3px 9px' }}>
                      {r.countLabel}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px 120px' }}>
          {displayedLocations.map((loc, i) => (
            <LocationCard key={loc.id} location={loc} index={i} ageBuckets={ageBuckets} />
          ))}
        </div>
      )}

      <ExploreFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        criteria={criteria}
        count={count}
        shown={shown}
        mealTypes={mealTypes}
        kids={kids}
        childLabel={childLabel}
        childSelection={childSelection}
        onChildSelection={setChildSelection}
        ageBucket={ageBucket}
        onAgeBucket={setAgeBucket}
        onChange={applyPatch}
        onClearAll={clearAll}
      />

      <Assistant
        open={assistantOpen}
        catalogCount={isLoading ? null : locations.length}
        kids={kids}
        mealTypes={mealTypes}
        onFinish={handleAssistantOutcome}
        onSkip={() => setAssistantOpen(false)}
      />
    </div>
  );
};

export default Index;
