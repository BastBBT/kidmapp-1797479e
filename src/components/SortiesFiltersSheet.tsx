import { useTranslation } from 'react-i18next';
import { FilterOption, FilterSection } from '@/components/FilterParts';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AGE_LABEL_KEY, ChildAgeBucket, bucketForChildMonths } from '@/lib/ageFilter';
import { Child, ChildFilterSelection, ageInMonths } from '@/lib/children';
import { translateToken } from '@/i18n/tokenMaps';
import { eventCategoryEmoji } from '@/types/event';
import { DAY_MOMENTS, type DayMoment, type EventCriteria } from '@/lib/sortiesFilters';

const KNOWN_CATEGORIES = ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Marché', 'Exposition'];
const AGE_BUCKET_CHOICES: ChildAgeBucket[] = ['0-2', '3-5', '6+'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteria: EventCriteria;
  count: (c: EventCriteria) => number;
  availableCategories: string[];
  kids: Child[];
  childSelection: ChildFilterSelection;
  onChildSelection: (s: ChildFilterSelection) => void;
  /** Tranche unique sans profil famille (`null` = tous les âges). */
  ageBucket: ChildAgeBucket | null;
  onAgeBucket: (b: ChildAgeBucket | null) => void;
  onToggleCategory: (cat: string) => void;
  onToggleMoment: (m: DayMoment) => void;
  onlyFree: boolean;
  onFree: (v: boolean) => void;
  onlyNearby: boolean;
  onNearby: (v: boolean) => void;
  onClearAll: () => void;
}

/**
 * Tous les filtres de Sorties, chaque option annonçant son propre nombre de
 * sorties, avec les autres filtres actifs. Pour les genres et les moments, qui
 * se cumulent, c'est le compte de l'option seule : « Festival 2 », pas le total
 * qu'on aurait en l'ajoutant à « Atelier ». Les choix s'appliquent tout de
 * suite ; le bouton du bas ne fait que refermer.
 * Miroir de `SortiesFiltersSheet` (iOS) / `_FiltersSheet` (Android).
 */
const SortiesFiltersSheet = (p: Props) => {
  const { t } = useTranslation();
  const base = p.criteria;
  const total = p.count(base);
  const categories = p.availableCategories.length > 0 ? p.availableCategories : KNOWN_CATEGORIES;
  const with_ = (patch: Partial<EventCriteria>) => p.count({ ...base, ...patch });

  const childLabel = (child: Child): string => {
    const name = child.first_name?.trim();
    const months = ageInMonths(child);
    if (!name) return t(AGE_LABEL_KEY[bucketForChildMonths(months)]);
    const age = months < 24 ? t('common.age_in_months', { age: months }) : t('common.age_in_years', { age: Math.round(months / 12) });
    return `${name} · ${age}`;
  };

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
                        label={childLabel(child)}
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
          <FilterSection title={t('sorties.what_kind')}>
            {categories.map((cat) => (
              <FilterOption
                key={cat}
                label={`${eventCategoryEmoji(cat)} ${translateToken('category_event', cat)}`}
                on={base.categories.has(cat)}
                count={with_({ categories: new Set([cat]) })}
                onClick={() => p.onToggleCategory(cat)}
              />
            ))}
          </FilterSection>
          <FilterSection title={t('sorties.what_time')}>
            {DAY_MOMENTS.map((m) => (
              <FilterOption
                key={m}
                label={t(`sorties.moment_${m}`)}
                on={base.moments.has(m)}
                count={with_({ moments: new Set([m]) })}
                onClick={() => p.onToggleMoment(m)}
              />
            ))}
          </FilterSection>
          <FilterSection title={t('sorties.price_distance')}>
            <FilterOption label={t('sorties.free')} on={p.onlyFree} count={with_({ onlyFree: true })} onClick={() => p.onFree(!p.onlyFree)} />
            <FilterOption label={t('sorties.nearby')} on={p.onlyNearby} count={with_({ onlyNearby: true })} onClick={() => p.onNearby(!p.onlyNearby)} />
          </FilterSection>
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
            {total === 0 ? t('sorties.cta_none') : t('sorties.cta_see', { count: total })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SortiesFiltersSheet;
