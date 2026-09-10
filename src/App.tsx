import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import LocationPage from "./pages/LocationPage";
import AdminPage from "./pages/AdminPage";
import SavedPage from "./pages/SavedPage";
import AccountPage from "./pages/AccountPage";
import SortiesPage from "./pages/SortiesPage";
import EventPage from "./pages/EventPage";
import WeeklyDigestLandingPage from "./pages/WeeklyDigestLandingPage";
import NewLocationAlertLandingPage from "./pages/NewLocationAlertLandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import SupportPage from "./pages/SupportPage";
import NotFound from "./pages/NotFound";
import AuthGate from "./components/AuthGate";
import IosAppBanner from "./components/IosAppBanner";
import BottomNav from "./components/BottomNav";
import Onboarding from "./components/Onboarding";
import Coachmarks from "./components/Coachmarks";
import AcquisitionModal from "./components/AcquisitionModal";
import ProposeLocationModal from "./components/ProposeLocationModal";
import ProposeEventModal from "./components/ProposeEventModal";
import ProposalTypeChooser from "./components/ProposalTypeChooser";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { RequireAuthProvider, useRequireAuth } from "./hooks/useRequireAuth";
import { ProposalModalProvider, useProposalModal } from "./hooks/useProposalModal";
import { usePageviewTracker } from "./hooks/usePageviewTracker";
import { CoachmarkProvider, useCoachmarks } from "./hooks/useCoachmarks";
import { flush as flushOnboardingStats } from "./lib/onboardingTracker";

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

const OnboardingOverlay = ({
  onVisibilityChange,
}: {
  onVisibilityChange: (visible: boolean) => void;
}) => {
  const { user, isLoading } = useAuth();
  const { openAuth } = useRequireAuth();
  const location = useLocation();
  const [show, setShow] = useState(false);
  // Le destinataire type d'un lien /semaine/<token> ou /nouveaux-lieux/<token>
  // arrive depuis un email, souvent sur un navigateur qui n'a jamais ouvert
  // kidmapp.app (donc sans le flag localStorage) — sans cette exclusion, le
  // carrousel plein écran recouvrirait la sélection qu'il vient justement de
  // venir consulter.
  const isDigestLanding =
    location.pathname.startsWith('/semaine/') || location.pathname.startsWith('/nouveaux-lieux/');

  useEffect(() => {
    if (isLoading || user || isDigestLanding) return;
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true);
    } catch {
      // ignore
    }
  }, [isLoading, user, isDigestLanding]);

  const visible = show && !user && !isDigestLanding;
  useEffect(() => {
    onVisibilityChange(visible);
  }, [visible, onVisibilityChange]);

  if (!visible) return null;

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

/**
 * Lance la visite guidée dès qu'aucun accueil plein écran ne la recouvre, et
 * pousse les compteurs accumulés avant l'auth à la première session connectée.
 *
 * Les bulles se jouent pour TOUT LE MONDE une fois : un visiteur déjà installé
 * n'a jamais vu l'onglet Sorties présenté ni l'invitation à contribuer, et ça
 * garantit un `coachmarks_outcome` renseigné pour tous les comptes.
 */
const CoachmarkStarter = ({ onboardingVisible }: { onboardingVisible: boolean }) => {
  const { start } = useCoachmarks();
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Un lien /semaine/<token> ou /nouveaux-lieux/<token> arrive depuis un email :
  // recouvrir la sélection qu'on vient consulter serait hostile. Même exclusion
  // que pour l'accueil.
  const isDigestLanding =
    location.pathname.startsWith('/semaine/') || location.pathname.startsWith('/nouveaux-lieux/');

  useEffect(() => {
    if (onboardingVisible || isDigestLanding) return;
    // Un temps de latence pour que la mise en page se stabilise : un halo mesuré
    // trop tôt vise à côté.
    const id = window.setTimeout(start, 800);
    return () => window.clearTimeout(id);
  }, [onboardingVisible, isDigestLanding, start]);

  useEffect(() => {
    if (isLoading || !user) return;
    void flushOnboardingStats(user.id);
  }, [isLoading, user]);

  return null;
};

const AppContent = () => {
  usePageviewTracker();
  const { isOpen: isProposalOpen, mode: proposalMode, close: closeProposal } = useProposalModal();
  // La visite guidée ne démarre pas sous le carrousel d'accueil.
  const [onboardingVisible, setOnboardingVisible] = useState(false);
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
        <Route path="/semaine/:token" element={<WeeklyDigestLandingPage />} />
        <Route path="/nouveaux-lieux/:token" element={<NewLocationAlertLandingPage />} />
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
      <OnboardingOverlay onVisibilityChange={setOnboardingVisible} />
      <CoachmarkStarter onboardingVisible={onboardingVisible} />
      <Coachmarks />
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
              <CoachmarkProvider>
                <AppContent />
              </CoachmarkProvider>
            </RequireAuthProvider>
          </ProposalModalProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
