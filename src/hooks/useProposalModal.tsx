import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface ProposalModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const ProposalModalContext = createContext<ProposalModalContextValue | null>(null);

export const ProposalModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <ProposalModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </ProposalModalContext.Provider>
  );
};

export const useProposalModal = (): ProposalModalContextValue => {
  const ctx = useContext(ProposalModalContext);
  if (!ctx) throw new Error('useProposalModal must be used within ProposalModalProvider');
  return ctx;
};
