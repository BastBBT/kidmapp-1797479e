import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
import AcquisitionModal from "./components/AcquisitionModal";
import ProposeLocationModal from "./components/ProposeLocationModal";
import ProposeEventModal from "./components/ProposeEventModal";
import ProposalTypeChooser from "./components/ProposalTypeChooser";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { RequireAuthProvider, useRequireAuth } from "./hooks/useRequireAuth";
import { ProposalModalProvider, useProposalModal, ProposalMode } from "./hooks/useProposalModal";
import { usePageviewTracker } from "./hooks/usePageviewTracker";
import { CoachmarkProvider } from "./hooks/useCoachmarks";
import { ChildrenProvider } from "./hooks/useChildren";
import ChildrenCaptureFlow from "./components/ChildrenCaptureFlow";
import ChildrenCaptureHookSheet from "./components/ChildrenCaptureHookSheet";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
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

/**
 * L'accueil plein écran (carrousel) et la visite guidée (bulles) ont été
 * retirés du site web : trop d'étapes avant d'accéder au contenu pour un
 * visiteur arrivant d'Instagram. Les composants `Onboarding` et `Coachmarks`
 * restent dans le dépôt, l'équivalent est géré à part dans les apps iOS/Android.
 */


/**
 * Ouvre la modale « Proposer » depuis un lien externe (bouton d'email :
 * `/propose?type=location` ou `/propose?type=event`). Le flow de
 * contribution n'a jamais eu de route dédiée — juste un state en mémoire
 * déclenché depuis BottomNav — donc c'est le seul point d'entrée possible
 * pour un lien qui arrive de l'extérieur de l'app. Chemin dédié (plutôt
 * qu'un paramètre sur `/`) pour matcher le composant AASA / App Links
 * iOS/Android sans intercepter tous les liens vers la racine du site.
 */
const ProposeDeepLinkHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { open } = useProposalModal();
  const { requireAuth } = useRequireAuth();
  const { t } = useTranslation();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || location.pathname !== '/propose') return;
    const params = new URLSearchParams(location.search);
    const raw = params.get('type');
    const mode: ProposalMode | null = raw === 'event' ? 'event' : raw === 'location' ? 'location' : null;

    handledRef.current = true;
    navigate('/', { replace: true });
    if (!mode) return;
    requireAuth(() => open(mode), {
      message: t(mode === 'event' ? 'nav.propose_event_auth_prompt' : 'nav.propose_auth_prompt'),
    });
  }, [location, navigate, open, requireAuth, t]);

  return null;
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
        {/* Lien d'entrée externe (email, universal link) — géré par ProposeDeepLinkHandler,
            qui redirige vers `/` une fois la modale ouverte. Route dédiée pour éviter un
            flash sur NotFound le temps que l'effet de redirection se déclenche. */}
        <Route path="/propose" element={<Index />} />
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
      <ProposeDeepLinkHandler />
      {/* Accueil plein écran et visite guidée retirés du site web (trop d'étapes
          avant le contenu pour un visiteur venu d'Instagram). Conservés dans le
          code pour les apps iOS/Android, gérées à part. */}

      <AcquisitionOverlay />
      <ChildrenCaptureHookSheet />
      <ChildrenCaptureFlow />
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
                <ChildrenProvider>
                  <AppContent />
                </ChildrenProvider>
              </CoachmarkProvider>
            </RequireAuthProvider>
          </ProposalModalProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
