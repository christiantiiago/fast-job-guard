import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ProtectedJobCreation } from "@/components/layout/ProtectedJobCreation";
import { ProtectedClientRoute } from "@/components/layout/ProtectedClientRoute";
import { ProtectedProviderRoute } from "@/components/layout/ProtectedProviderRoute";
import { ProtectedKYCRoute } from "@/components/layout/ProtectedKYCRoute";
import { KYCGate } from "@/components/kyc/KYCGate";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminLogin from "./pages/auth/AdminLogin";
import ProfileEdit from "./pages/ProfileEdit";
import NotFound from "./pages/NotFound";

// Protected pages
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import JobNew from "./pages/JobNew";
import JobProposals from "./pages/JobProposals";
import JobsInProgress from "./pages/JobsInProgress";
import Discover from "./pages/Discover";
import ProvidersDiscover from "./pages/ProvidersDiscover";
import UserProfile from "./pages/UserProfile";
import ClientWallet from "./pages/ClientWallet";
import Chat from "./pages/Chat";
import Chats from "./pages/Chats";
import { JobChatPage } from "./components/chat/JobChatPage";
import Wallet from "./pages/Wallet";
import Reviews from "./pages/Reviews";
import Finance from "./pages/provider/Finance";
import Premium from "./pages/Premium";
import ProviderOnboarding from "./pages/provider/Onboarding";
import SystemReport from "./pages/SystemReport";
import HelpSupport from "./pages/HelpSupport";
import Contracts from "./pages/Contracts";

// KYC pages
import KYCVerify from "./pages/kyc/KYCVerify";
import { ImprovedDocumentsPage } from '@/components/kyc/ImprovedDocumentsPage';

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminKYCEnhanced from "./pages/admin/KYCEnhanced";
import AdminPayments from "./pages/admin/Payments";
import AdminDisputes from "./pages/admin/Disputes";
import AdminSettings from "./pages/admin/Settings";
import AdminActivity from "./pages/admin/Activity";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminEnhanced from "./pages/admin/AdminEnhanced";
import Checkout from "./pages/Checkout";
import DirectProposalCheckout from "./pages/DirectProposalCheckout";
import CheckoutSuccess from "./pages/checkout/Success";
import CheckoutCancel from "./pages/checkout/Cancel";
import BoostSuccess from "./pages/checkout/BoostSuccess";
import AbacatePaySuccess from "./pages/checkout/AbacatePaySuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="jobfast-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/admin" element={<AdminLogin />} />

            {/* KYC routes - protected but allowed without full KYC */}
            <Route
              path="/kyc/verify"
              element={
                <ProtectedRoute>
                  <KYCVerify />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kyc/documents"
              element={
                <ProtectedRoute>
                  <ImprovedDocumentsPage />
                </ProtectedRoute>
              }
            />

            {/* Protected routes with KYC gate */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ProtectedKYCRoute>
                    <Dashboard />
                  </ProtectedKYCRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <ProfileEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <ProtectedKYCRoute>
                    <Jobs />
                  </ProtectedKYCRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <ProtectedKYCRoute>
                    <JobDetails />
                  </ProtectedKYCRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/in-progress"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <JobsInProgress />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <ProtectedRoute>
                  <ProtectedKYCRoute>
                    <ProtectedJobCreation>
                      <JobNew />
                    </ProtectedJobCreation>
                  </ProtectedKYCRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id/proposals"
              element={
                <ProtectedRoute>
                  <ProtectedKYCRoute>
                    <JobProposals />
                  </ProtectedKYCRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/discover"
              element={
                <ProtectedProviderRoute>
                  <KYCGate>
                    <Discover />
                  </KYCGate>
                </ProtectedProviderRoute>
              }
            />
            <Route
              path="/providers/discover"
              element={
                <ProtectedClientRoute>
                  <KYCGate>
                    <ProvidersDiscover />
                  </KYCGate>
                </ProtectedClientRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Chats />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Chat />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:jobId"
              element={
                <ProtectedRoute>
                  <ProtectedKYCRoute>
                    <JobChatPage />
                  </ProtectedKYCRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Wallet />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <UserProfile />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Reviews />
                  </KYCGate>
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout/:jobId"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Checkout />
                  </KYCGate>
                </ProtectedRoute>
              }
            />

            <Route
              path="/direct-proposal-checkout"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <DirectProposalCheckout />
                  </KYCGate>
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout/success"
              element={
                <ProtectedRoute>
                  <CheckoutSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout/cancel"
              element={
                <ProtectedRoute>
                  <CheckoutCancel />
                </ProtectedRoute>
              }
            />

            <Route
              path="/abacatepay-success"
              element={
                <ProtectedRoute>
                  <AbacatePaySuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="/boost-success"
              element={
                <ProtectedRoute>
                  <BoostSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="/premium"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Premium />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <HelpSupport />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-report"
              element={
                <ProtectedRoute>
                  <SystemReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Contracts />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedProviderRoute>
                  <KYCGate>
                    <Wallet />
                  </KYCGate>
                </ProtectedProviderRoute>
              }
            />

            {/* Provider routes */}
            <Route
              path="/provider/onboarding"
              element={
                <ProtectedProviderRoute>
                  <KYCGate>
                    <ProviderOnboarding />
                  </KYCGate>
                </ProtectedProviderRoute>
              }
            />
            <Route
              path="/provider/finance"
              element={
                <ProtectedProviderRoute>
                  <KYCGate>
                    <Wallet />
                  </KYCGate>
                </ProtectedProviderRoute>
              }
            />

            {/* Admin routes - no KYC gate for admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kyc"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminKYCEnhanced />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDisputes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activity"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminActivity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/enhanced"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminEnhanced />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;