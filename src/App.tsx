import { useEffect, useState } from "react";
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
      if (!localStorage.getItem(ACQUISITION_FLAG)) {
        setShow(true);
      }
    } catch {
      // ignore
    }
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
  const { isOpen: isProposalOpen, close: closeProposal } = useProposalModal();
  return (
    <>
      <IosAppBanner />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/location/:id" element={<LocationPage />} />
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
      <ProposeLocationModal open={isProposalOpen} onClose={closeProposal} />
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
