import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";

// Protected pages
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Jobs from "./pages/Jobs";
import JobNew from "./pages/JobNew";
import JobDetails from "./pages/JobDetails";
import Discover from "./pages/Discover";
import AllJobs from "./pages/AllJobs";
import Chat from "./pages/Chat";
import Wallet from "./pages/Wallet";
import Reviews from "./pages/Reviews";
import ProviderJobs from "./pages/provider/Jobs";
import ProviderFinance from "./pages/provider/Finance";
import ProviderOnboarding from "./pages/provider/Onboarding";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminJobs from "./pages/admin/Jobs";
import AdminPayments from "./pages/admin/Payments";
import AdminDisputes from "./pages/admin/Disputes";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
              path="/jobs"
              element={
                <ProtectedRoute>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <ProtectedRoute>
                  <JobNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <JobDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <Discover />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-jobs"
              element={
                <ProtectedRoute>
                  <AllJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:jobId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute>
                  <Reviews />
                </ProtectedRoute>
              }
            />

            {/* Provider routes */}
            <Route
              path="/provider/onboarding"
              element={
                <ProtectedRoute>
                  <ProviderOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/jobs"
              element={
                <ProtectedRoute>
                  <ProviderJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/finance"
              element={
                <ProtectedRoute>
                  <ProviderFinance />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
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
              path="/admin/jobs"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminJobs />
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

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;