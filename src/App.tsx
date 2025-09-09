import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ProtectedJobCreation } from "@/components/layout/ProtectedJobCreation";
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
import JobNew from "./pages/JobNew";
import JobDetails from "./pages/JobDetails";
import Discover from "./pages/Discover";
import ProvidersDiscover from "./pages/ProvidersDiscover";
import Chat from "./pages/Chat";
import Wallet from "./pages/Wallet";
import Reviews from "./pages/Reviews";
import Finance from "./pages/provider/Finance";
import Premium from "./pages/Premium";
import ProviderOnboarding from "./pages/provider/Onboarding";

// KYC pages
import KYCVerify from "./pages/kyc/KYCVerify";
import { ImprovedDocumentsPage } from '@/components/kyc/ImprovedDocumentsPage';

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminKYC from "./pages/admin/KYC";
import AdminPayments from "./pages/admin/Payments";
import AdminDisputes from "./pages/admin/Disputes";
import AdminSettings from "./pages/admin/Settings";
import AdminActivity from "./pages/admin/Activity";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminEnhanced from "./pages/admin/AdminEnhanced";
import Checkout from "./pages/Checkout";

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
                  <KYCGate>
                    <Dashboard />
                  </KYCGate>
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
                  <KYCGate>
                    <Jobs />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <ProtectedJobCreation>
                      <JobNew />
                    </ProtectedJobCreation>
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <JobDetails />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Discover />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/providers/discover"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <ProvidersDiscover />
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
                  <KYCGate>
                    <Chat />
                  </KYCGate>
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
              path="/premium"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Premium />
                  </KYCGate>
                </ProtectedRoute>
              }
            />

            {/* Provider routes */}
            <Route
              path="/provider/onboarding"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <ProviderOnboarding />
                  </KYCGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/finance"
              element={
                <ProtectedRoute>
                  <KYCGate>
                    <Finance />
                  </KYCGate>
                </ProtectedRoute>
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
                  <AdminKYC />
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