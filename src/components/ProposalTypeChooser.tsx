import { useProposalModal } from '@/hooks/useProposalModal';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const OPTIONS: { id: 'location' | 'activity' | 'event'; emoji: string; title: string; subtitle: string; color: string }[] = [
  {
    id: 'location',
    emoji: '📍',
    title: 'Un lieu',
    subtitle: 'Restaurant, café, boutique…',
    color: '#D95F3B',
  },
  {
    id: 'activity',
    emoji: '🌿',
    title: 'Une activité',
    subtitle: 'Nature, sport, créatif…',
    color: '#3B7D6E',
  },
  {
    id: 'event',
    emoji: '🎉',
    title: 'Un événement',
    subtitle: 'Daté (spectacle, festival…)',
    color: '#EF9F27',
  },
];

const ProposalTypeChooser = () => {
  const { isOpen, mode, setMode, close } = useProposalModal();

  if (mode !== 'chooser') return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000]"
            style={{ background: 'rgba(28,25,23,0.3)' }}
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-[1000]"
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius) var(--radius) 0 0', padding: 20, paddingBottom: 32 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>
                Que veux-tu proposer ?
              </h2>
              <button onClick={close} className="p-2 rounded-full" style={{ background: 'var(--bg)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p style={{ fontFamily: 'Caveat', fontSize: 15, color: 'var(--text-muted)', marginBottom: 18 }}>
              Aide la communauté à découvrir de nouvelles pépites ✦
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: 14,
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = opt.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: `${opt.color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {opt.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {opt.subtitle}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>›</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProposalTypeChooser;
