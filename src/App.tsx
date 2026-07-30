import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LocationPage from "./pages/LocationPage";
import AdminPage from "./pages/AdminPage";
import SavedPage from "./pages/SavedPage";
import AccountPage from "./pages/AccountPage";
import SortiesPage from "./pages/SortiesPage";
import EventPage from "./pages/EventPage";
import PrivacyPage from "./pages/PrivacyPage";
import SupportPage from "./pages/SupportPage";
import NotFound from "./pages/NotFound";
import AuthGate from "./components/AuthGate";
import IosAppBanner from "./components/IosAppBanner";
import BottomNav from "./components/BottomNav";
import Onboarding from "./components/Onboarding";
import AcquisitionModal from "./components/AcquisitionModal";
import ProposeLocationModal from "./components/ProposeLocationModal";
import ProposeEventModal from "./components/ProposeEventModal";
import ProposalTypeChooser from "./components/ProposalTypeChooser";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { RequireAuthProvider, useRequireAuth } from "./hooks/useRequireAuth";
import { ProposalModalProvider, useProposalModal } from "./hooks/useProposalModal";
import { usePageviewTracker } from "./hooks/usePageviewTracker";

const queryClient = new QueryClient();
const ONBOARDING_KEY = 'kidmapp_hasSeenOnboarding';
const ACQUISITION_FLAG = 'hasAnsweredAcquisition';

const AcquisitionOverlay = () => {
  const { user, isLoading } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    try {
      if (localStorage.getItem(ACQUISITION_FLAG)) return;
    } catch {
      // ignore
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('acquisition_source')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('acquisition check error', error);
          return;
        }
        // La réponse est déjà en base (répondu depuis un autre appareil/navigateur,
        // ou le flag local n'a pas pu être écrit) : on resynchronise le flag local
        // et on n'affiche pas la popup une nouvelle fois.
        if ((data as { acquisition_source: string | null } | null)?.acquisition_source) {
          try {
            localStorage.setItem(ACQUISITION_FLAG, 'true');
          } catch {
            // ignore
          }
          return;
        }
        setShow(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  if (!user) return null;
  return <AcquisitionModal open={show} onClose={() => setShow(false)} />;
};

const OnboardingOverlay = () => {
  const { user, isLoading } = useAuth();
  const { openAuth } = useRequireAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading || user) return;
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true);
    } catch {
      // ignore
    }
  }, [isLoading, user]);

  if (!show || user) return null;

  return (
    <Onboarding
      onFinish={(mode) => {
        setShow(false);
        if (mode === 'browse') return;
        openAuth(mode);
      }}
    />
  );
};

const AppContent = () => {
  usePageviewTracker();
  const { isOpen: isProposalOpen, mode: proposalMode, close: closeProposal } = useProposalModal();
  const locationModalOpen = isProposalOpen && (proposalMode === 'location' || proposalMode === 'activity');
  const initialCategory = proposalMode === 'activity' ? 'nature' : 'restaurant';
  return (
    <>
      <IosAppBanner />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/location/:id" element={<LocationPage />} />
        <Route path="/sorties" element={<SortiesPage />} />
        <Route path="/event/:id" element={<EventPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* Auth-required routes */}
        <Route
          path="/saved"
          element={
            <AuthGate>
              <SavedPage />
            </AuthGate>
          }
        />
        <Route
          path="/gestion-k1dm4p"
          element={
            <AuthGate>
              <AdminPage />
            </AuthGate>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <OnboardingOverlay />
      <AcquisitionOverlay />
      <ProposalTypeChooser />
      <ProposeLocationModal open={locationModalOpen} onClose={closeProposal} initialCategory={initialCategory} mode={proposalMode === 'activity' ? 'activity' : 'location'} />
      <ProposeEventModal />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProposalModalProvider>
            <RequireAuthProvider>
              <AppContent />
            </RequireAuthProvider>
          </ProposalModalProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
