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
import PrivacyPage from "./pages/PrivacyPage";
import SupportPage from "./pages/SupportPage";
import NotFound from "./pages/NotFound";
import AuthGate from "./components/AuthGate";
import BottomNav from "./components/BottomNav";
import Onboarding from "./components/Onboarding";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { RequireAuthProvider, useRequireAuth } from "./hooks/useRequireAuth";

const queryClient = new QueryClient();
const ONBOARDING_KEY = 'kidmapp_hasSeenOnboarding';

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
  return (
    <>
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
          <RequireAuthProvider>
            <AppContent />
          </RequireAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
