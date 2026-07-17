import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

export type ProposalMode = 'chooser' | 'location' | 'activity' | 'event';

interface ProposalModalContextValue {
  isOpen: boolean;
  mode: ProposalMode;
  open: (mode?: ProposalMode) => void;
  setMode: (mode: ProposalMode) => void;
  close: () => void;
}

const ProposalModalContext = createContext<ProposalModalContextValue | null>(null);

export const ProposalModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ProposalMode>('chooser');

  const open = useCallback((initial?: ProposalMode) => {
    setMode(initial ?? 'chooser');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setMode('chooser'), 300);
  }, []);

  return (
    <ProposalModalContext.Provider value={{ isOpen, mode, open, setMode, close }}>
      {children}
    </ProposalModalContext.Provider>
  );
};

export const useProposalModal = (): ProposalModalContextValue => {
  const ctx = useContext(ProposalModalContext);
  if (!ctx) throw new Error('useProposalModal must be used within ProposalModalProvider');
  return ctx;
};
