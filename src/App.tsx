import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { RequireAdmin, RequireAuth } from '@/components/ProtectedRoute';
import { AdminProvider } from "@/contexts/AdminContext";
import { SecurityCheck } from '@/components/SecurityCheck';
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import GamePage from "./pages/GamePage";
import LoginPage from "./pages/LoginPage";
import CircularsPage from "./pages/CircularsPage";
import ContactsPage from "./pages/ContactsPage";
import ChampionshipView from "./pages/ChampionshipView";
import NotFound from "./pages/NotFound";
import ChampionshipSelectionPage from "./pages/ChampionshipSelectionPage";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MedalTable = lazy(() => import("./pages/MedalTable"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const CallRoomPage = lazy(() => import("./pages/CallRoomPage"));
const BibRangesPage = lazy(() => import("./pages/BibRangesPage"));
const TenantDashboardPage = lazy(() => import("./pages/TenantDashboardPage"));
const OpenTournamentsPage = lazy(() => import("./pages/OpenTournamentsPage"));
const TeamRegistrationStatusPage = lazy(() => import("./pages/TeamRegistrationStatusPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminProvider>
      <TooltipProvider>
        <SecurityCheck />
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/championship/:championshipId" element={<ChampionshipView />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center">Unauthorized</div>} />
            <Route
              path="/admin"
              element={(
                <RequireAdmin>
                  <Suspense fallback={<div>Loading...</div>}>
                    <AdminDashboard />
                  </Suspense>
                </RequireAdmin>
              )}
            />
            <Route path="/rankings" element={<ChampionshipSelectionPage mode="rankings" />} />
            <Route
              path="/medal-table"
              element={(
                <Suspense fallback={<div>Loading...</div>}>
                  <MedalTable />
                </Suspense>
              )}
            />
            <Route path="/signup" element={(
              <Suspense fallback={<div>Loading...</div>}><SignUpPage /></Suspense>
            )} />
            <Route path="/pricing" element={(
              <Suspense fallback={<div>Loading...</div>}><PricingPage /></Suspense>
            )} />
            <Route path="/open-tournaments" element={(
              <Suspense fallback={<div>Loading...</div>}><OpenTournamentsPage /></Suspense>
            )} />
            <Route path="/team-status" element={(
              <Suspense fallback={<div>Loading...</div>}><TeamRegistrationStatusPage /></Suspense>
            )} />
            <Route path="/payment-success" element={(
              <Suspense fallback={<div>Loading...</div>}><PaymentSuccessPage /></Suspense>
            )} />
            <Route path="/circulars" element={<CircularsPage />} />
            <Route path="/qualified-teams" element={<ChampionshipSelectionPage mode="qualified" />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/call-room" element={(
              <RequireAuth>
                <Suspense fallback={<div>Loading...</div>}><CallRoomPage /></Suspense>
              </RequireAuth>
            )} />
            <Route path="/bib-ranges" element={(
              <RequireAuth>
                <Suspense fallback={<div>Loading...</div>}><BibRangesPage /></Suspense>
              </RequireAuth>
            )} />
            <Route path="/my-account" element={(
              <RequireAuth>
                <Suspense fallback={<div>Loading...</div>}><TenantDashboardPage /></Suspense>
              </RequireAuth>
            )} />
            <Route path="/dashboard" element={(
              <RequireAuth>
                <Suspense fallback={<div>Loading...</div>}><TenantDashboardPage /></Suspense>
              </RequireAuth>
            )} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </AdminProvider>
  </QueryClientProvider>
);

export default App;
