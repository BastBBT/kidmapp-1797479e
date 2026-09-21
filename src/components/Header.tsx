import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import CategoryFilter from '@/components/CategoryFilter';
import AgeFilter from '@/components/AgeFilter';
import { useCoachmarkTarget } from '@/hooks/useCoachmarks';
import { CategoryGroup, LocationCategory } from '@/types/location';
import { AgeBucket } from '@/lib/ageFilter';
import { MascotteMiniature } from '@/components/Mascotte';


interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
  selectedCategory?: LocationCategory | 'all';
  onCategoryChange?: (cat: LocationCategory | 'all') => void;
  selectedGroup?: CategoryGroup;
  onGroupChange?: (g: CategoryGroup) => void;
  selectedAge?: AgeBucket;
  onAgeChange?: (b: AgeBucket) => void;
  /** Remplace la barre de tranche générique par `ChildrenPillBar` dès qu'au
   *  moins un enfant est enregistré — passé par la page, pas décidé ici. */
  ageRowOverride?: ReactNode;
  /** Rouvre l'assistant mascotte à la demande — seul moyen de le relancer une
   *  fois la journée entamée, puisqu'il ne s'ouvre de lui-même qu'une fois
   *  par jour. Absent = pas d'icône (pages autres qu'Explorer). */
  onOpenAssistant?: () => void;
}

const Header = ({ onSearch, searchValue, selectedCategory, onCategoryChange, selectedGroup, onGroupChange, selectedAge, onAgeChange, ageRowOverride, onOpenAssistant }: HeaderProps) => {
  const categoriesTargetRef = useCoachmarkTarget('categories');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="container px-4">
        {/* Row 1 — Logo + avatar */}
        <div className="flex items-center justify-between h-14">
          <div className="flex flex-col cursor-pointer leading-none" onClick={() => navigate('/')}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', color: 'var(--primary)', letterSpacing: '-0.03em', fontWeight: 600 }}>
              Kidmapp
            </span>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', color: 'var(--text-muted)' }}>
              — Nantes
            </span>
          </div>

          <nav className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/gestion-k1dm4p')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: location.pathname === '/gestion-k1dm4p' ? 'var(--primary)' : 'transparent',
                  color: location.pathname === '/gestion-k1dm4p' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Admin
              </button>
            )}

            {/* Uniquement la bulle de l'assistant et son texte : l'avatar
                (lettre du compte) faisait doublon avec l'onglet compte de la
                barre du bas et encombrait le coin sans raison d'y être. */}
            {onOpenAssistant && (
              <button
                type="button"
                onClick={onOpenAssistant}
                className="flex items-center gap-1.5 cursor-pointer"
                aria-label={t('assistant.open')}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('assistant.coup_de_main')}
                </span>
                <MascotteMiniature />
              </button>
            )}
          </nav>
        </div>

        {/* Row 2 — Search bar */}
        {onSearch && (
          <div className="relative pb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)', marginTop: '-6px' }} />
            <input
              type="text"
              placeholder={t('common.search_place')}
              value={searchValue ?? ''}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm outline-none transition-colors"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Row 3 — Category filter */}
        {selectedCategory !== undefined && onCategoryChange && selectedGroup && onGroupChange && (
          <div className="pb-2" ref={categoriesTargetRef}>
            <CategoryFilter
              selected={selectedCategory}
              onChange={onCategoryChange}
              group={selectedGroup}
              onGroupChange={onGroupChange}
            />
          </div>
        )}

        {/* Row 4 — Age filter (persistent), ou barre d'enfants si le compte en a */}
        {ageRowOverride ? (
          <div className="pb-2">{ageRowOverride}</div>
        ) : (
          selectedAge !== undefined && onAgeChange && (
            <div className="pb-2">
              <AgeFilter selected={selectedAge} onChange={onAgeChange} />
            </div>
          )
        )}
      </div>


    </header>
  );
};

export default Header;
