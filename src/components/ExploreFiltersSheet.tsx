import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { FilterOption, FilterSection } from '@/components/FilterParts';
import { AGE_LABEL_KEY, ChildAgeBucket, bucketForChildMonths } from '@/lib/ageFilter';
import { Child, ChildFilterSelection, ageInMonths } from '@/lib/children';
import { DURATIONS } from '@/lib/activity';
import { translateToken } from '@/i18n/tokenMaps';
import type { MealType } from '@/hooks/useMeals';
import { WEATHER_OPTIONS, weatherLabelKey, type ExploreCriteria } from '@/lib/exploreFilters';

const AGE_BUCKET_CHOICES: ChildAgeBucket[] = ['0-2', '3-5', '6+'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteria: ExploreCriteria;
  count: (c: ExploreCriteria) => number;
  /** Nombre affiché par la liste (le tri « Les plus aimés » écarte les lieux sans favori). */
  shown: number;
  mealTypes: MealType[];
  kids: Child[];
  childLabel: (child: Child) => string;
  childSelection: ChildFilterSelection;
  onChildSelection: (s: ChildFilterSelection) => void;
  /** Tranche unique sans profil famille (`null` = tous les âges). */
  ageBucket: ChildAgeBucket | null;
  onAgeBucket: (b: ChildAgeBucket | null) => void;
  onChange: (patch: Partial<ExploreCriteria>) => void;
  onClearAll: () => void;
}

/**
 * Tous les filtres d'Explorer, chaque option annonçant son propre nombre de
 * résultats avec les autres filtres actifs. Les choix s'appliquent tout de suite ;
 * le bouton du bas ne fait que refermer. Seules les sections du groupe affiché
 * apparaissent : repas côté lieux ; gratuit, météo et durée côté activités.
 * Miroir d'`ExploreFiltersSheet` (iOS) / `_FiltersSheet` d'explore_screen.dart.
 */
const ExploreFiltersSheet = (p: Props) => {
  const { t } = useTranslation();
  const base = p.criteria;
  const with_ = (patch: Partial<ExploreCriteria>) => p.count({ ...base, ...patch });
  const isActivity = base.group === 'activities';
  const meals = [...p.mealTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <Sheet open={p.open} onOpenChange={p.onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col" style={{ maxHeight: '88vh', background: 'var(--bg)', borderRadius: '22px 22px 0 0', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px 0 16px' }}>
          <SheetTitle style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{t('sorties.filters')}</SheetTitle>
          <button
            type="button"
            onClick={p.onClearAll}
            style={{ minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--secondary)' }}
          >
            {t('sorties.clear_all')}
          </button>
        </div>
        <SheetDescription className="sr-only">{t('sorties.filters')}</SheetDescription>
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px 4px' }}>
          <FilterSection title={t('sorties.for_whom')}>
            {p.kids.length === 0
              ? AGE_BUCKET_CHOICES.map((b) => (
                  <FilterOption
                    key={b}
                    label={t(AGE_LABEL_KEY[b])}
                    on={p.ageBucket === b}
                    count={with_({ ageBuckets: new Set([b]) })}
                    onClick={() => p.onAgeBucket(p.ageBucket === b ? null : b)}
                  />
                ))
              : [
                  ...p.kids.map((child) => {
                    const on = p.childSelection.kind === 'child' && p.childSelection.id === child.id;
                    return (
                      <FilterOption
                        key={child.id}
                        label={p.childLabel(child)}
                        on={on}
                        count={with_({ ageBuckets: new Set([bucketForChildMonths(ageInMonths(child))]) })}
                        onClick={() => p.onChildSelection(on ? { kind: 'none' } : { kind: 'child', id: child.id })}
                      />
                    );
                  }),
                  ...(p.kids.length > 1
                    ? [
                        <FilterOption
                          key="__all__"
                          label={t('children.pill_all_mine')}
                          on={p.childSelection.kind === 'allChildren'}
                          count={with_({ ageBuckets: new Set(p.kids.map((k) => bucketForChildMonths(ageInMonths(k)))) })}
                          onClick={() => p.onChildSelection(p.childSelection.kind === 'allChildren' ? { kind: 'none' } : { kind: 'allChildren' })}
                        />,
                      ]
                    : []),
                ]}
          </FilterSection>
          <FilterSection title={t('explore.section_practical')}>
            <FilterOption label={t('explore.open_now')} on={base.onlyOpen} count={with_({ onlyOpen: true })} onClick={() => p.onChange({ onlyOpen: !base.onlyOpen })} />
            <FilterOption label={t('sorties.nearby')} on={base.onlyNearby} count={with_({ onlyNearby: true })} onClick={() => p.onChange({ onlyNearby: !base.onlyNearby })} />
            {isActivity && (
              <FilterOption label={t('sorties.free')} on={base.onlyFree} count={with_({ onlyFree: true })} onClick={() => p.onChange({ onlyFree: !base.onlyFree })} />
            )}
          </FilterSection>
          {isActivity ? (
            <>
              <FilterSection title={t('explore.section_weather')}>
                {WEATHER_OPTIONS.map((w) => (
                  <FilterOption
                    key={w}
                    label={t(weatherLabelKey(w))}
                    on={base.weather === w}
                    count={with_({ weather: w })}
                    onClick={() => p.onChange({ weather: base.weather === w ? null : w })}
                  />
                ))}
              </FilterSection>
              <FilterSection title={t('explore.section_duration')}>
                {DURATIONS.map((d) => (
                  <FilterOption
                    key={d}
                    label={translateToken('duration', d)}
                    on={base.duration === d}
                    count={with_({ duration: d })}
                    onClick={() => p.onChange({ duration: base.duration === d ? null : d })}
                  />
                ))}
              </FilterSection>
            </>
          ) : (
            meals.length > 0 && (
              <FilterSection title={t('explore.section_meal')}>
                {meals.map((m) => (
                  <FilterOption
                    key={m.id}
                    label={`${m.emoji} ${translateToken('meal', m.short_label)}`}
                    on={base.mealId === m.id}
                    count={with_({ mealId: m.id })}
                    onClick={() => p.onChange({ mealId: base.mealId === m.id ? null : m.id })}
                  />
                ))}
              </FilterSection>
            )
          )}
        </div>
        <div style={{ padding: '4px 16px 16px' }}>
          <button
            type="button"
            onClick={() => p.onOpenChange(false)}
            style={{
              width: '100%', minHeight: 50, border: 'none', borderRadius: 14, cursor: 'pointer',
              background: 'var(--primary)', color: '#fff', fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600,
            }}
          >
            {t(isActivity ? 'explore.cta_activities' : 'explore.cta_places', { count: p.shown })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExploreFiltersSheet;
