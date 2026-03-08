import { useParams, useNavigate } from 'react-router-dom';
import { categoryIcons, categoryLabels } from '@/types/location';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import ContributionModal from '@/components/ContributionModal';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { useLocation as useLocationData } from '@/hooks/useLocations';
import { useFavorites } from '@/hooks/useFavorites';

const categoryGradients: Record<string, string> = {
  restaurant: 'linear-gradient(145deg, #F5C0A8, #D9805E)',
  cafe: 'linear-gradient(145deg, #A8D4CE, #5FA89D)',
  public: 'linear-gradient(145deg, #B8D9A4, #72B05E)',
  shop: 'linear-gradient(145deg, #F5E0A0, #E0B848)',
};

const HighChairSVG = ({ color }: { color: string }) => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="11" y="4" width="14" height="10" rx="3"/>
    <path d="M11 14 L8 26"/><path d="M25 14 L28 26"/><path d="M8 20 L28 20"/><path d="M14 26 L22 26"/>
  </svg>
);

const ChangingTableSVG = ({ color }: { color: string }) => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="18" width="28" height="5" rx="2"/>
    <path d="M7 18 L7 28"/><path d="M29 18 L29 28"/><circle cx="18" cy="11" r="4"/><path d="M14 15 Q18 21 22 15"/>
  </svg>
);

const KidsAreaSVG = ({ color }: { color: string }) => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 28 L8 14 Q8 10 12 10 L24 10"/><path d="M8 28 L22 28"/><path d="M24 10 Q32 14 28 24 L22 28"/><circle cx="26" cy="26" r="3"/>
  </svg>
);

const EquipBlock = ({ available, icon, label }: { available: boolean; icon: React.ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: available ? '#EBF6EC' : 'var(--bg)',
        opacity: available ? 1 : 0.6,
      }}
    >
      {icon}
    </div>
    <span className="font-body text-[10px] uppercase tracking-wider font-medium" style={{ color: available ? '#2E7D32' : 'var(--text-muted)' }}>
      {label}
    </span>
    <span className="font-hand text-[13px]" style={{ color: available ? '#2E7D32' : 'var(--text-muted)' }}>
      {available ? '✓ Dispo' : '— ?'}
    </span>
  </div>
);

const LocationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showContribution, setShowContribution] = useState(false);
  const { data: location, isLoading } = useLocationData(id ?? '');
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = location ? isFavorite(location.id) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Chargement…</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Lieu introuvable</p>
      </div>
    );
  }

  const gradient = categoryGradients[location.category] || categoryGradients.public;

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <Header />
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: '260px', background: gradient }}>
        {/* Blobs */}
        <svg style={{ position: 'absolute', bottom: '-10px', left: '-20px', width: '200px', height: '160px', zIndex: 2 }} viewBox="0 0 200 160">
          <path d="M20,140 C-10,120 -5,70 20,40 C45,10 90,0 130,15 C170,30 195,70 180,105 C165,140 130,165 90,158 C60,152 38,152 20,140Z" fill="rgba(255,255,255,0.16)" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '-20px', right: '-10px', width: '180px', height: '150px', zIndex: 2 }} viewBox="0 0 180 150">
          <path d="M160,130 C140,155 100,162 65,148 C30,134 5,100 8,65 C11,30 40,5 75,2 C110,-1 148,20 165,52 C180,80 178,108 160,130Z" fill="rgba(255,255,255,0.10)" />
        </svg>
        <svg style={{ position: 'absolute', top: '20px', right: '20px', width: '90px', height: '90px', zIndex: 2 }} viewBox="0 0 90 90">
          <path d="M45,5 C65,3 83,18 87,38 C91,58 78,77 58,84 C38,91 17,81 8,62 C-1,43 7,20 25,10 C33,5 38,6 45,5Z" fill="rgba(255,255,255,0.13)" />
        </svg>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Text over hero */}
        <div className="absolute bottom-6 left-5 z-10">
          <span className="font-hand italic text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {categoryLabels[location.category as keyof typeof categoryLabels]}
          </span>
          <h1 className="font-display text-[30px] font-semibold text-white" style={{ letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {location.name}
          </h1>
        </div>
      </div>

      {/* Content card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container px-4 -mt-6 relative z-10">
        <div className="p-5" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
          {location.address && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              📍 {location.address}
            </p>
          )}

          <h2 className="font-display text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Équipements enfants
          </h2>

          <div className="flex justify-around">
            <EquipBlock
              available={location.high_chair}
              icon={<HighChairSVG color={location.high_chair ? '#2E7D32' : 'var(--text-muted)'} />}
              label="Chaise haute"
            />
            <EquipBlock
              available={location.changing_table}
              icon={<ChangingTableSVG color={location.changing_table ? '#2E7D32' : 'var(--text-muted)'} />}
              label="Table à langer"
            />
            <EquipBlock
              available={location.kids_area}
              icon={<KidsAreaSVG color={location.kids_area ? '#2E7D32' : 'var(--text-muted)'} />}
              label="Espace jeux"
            />
          </div>

          {/* Nudge contribution */}
          <div className="flex items-center justify-between gap-3 mt-4 p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Vous connaissez ce lieu ?
              </div>
              <div style={{ fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Aidez les autres familles ✦
              </div>
            </div>
            <button
              onClick={() => setShowContribution(true)}
              className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
              style={{ border: '1.5px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}
            >
              Contribuer
            </button>
          </div>

          {/* Bouton Itinéraire */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full mt-3 py-4 rounded-full text-white font-semibold text-base"
            style={{ background: 'var(--primary)', fontFamily: 'DM Sans' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Itinéraire
          </a>
        </div>
      </motion.div>
      <ContributionModal location={location} open={showContribution} onClose={() => setShowContribution(false)} />
    </div>
  );
};

export default LocationPage;
