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
import NotFound from "./pages/NotFound";
import AuthGate from "./components/AuthGate";
import BottomNav from "./components/BottomNav";
import { useAuth, AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const showBottomNav = !!user;

  return (
    <>
      <AuthGate>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/location/:id" element={<LocationPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthGate>
      {showBottomNav && <BottomNav />}
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
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
