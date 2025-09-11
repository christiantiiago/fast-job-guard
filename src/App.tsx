// src/App.tsx
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ProtectedJobCreation } from "@/components/layout/ProtectedJobCreation";
import { ProtectedClientRoute } from "@/components/layout/ProtectedClientRoute";
import { ProtectedProviderRoute } from "@/components/layout/ProtectedProviderRoute";
import { KYCGate } from "@/components/kyc/KYCGate";

// 🔹 Lazy loaded pages (melhora performance)
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const JobNew = lazy(() => import("./pages/JobNew"));
const JobProposals = lazy(() => import("./pages/JobProposals"));
const JobsInProgress = lazy(() => import("./pages/JobsInProgress"));
const Discover = lazy(() => import("./pages/Discover"));
const ProvidersDiscover = lazy(() => import("./pages/ProvidersDiscover"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const ClientWallet = lazy(() => import("./pages/ClientWallet"));
const Chat = lazy(() => import("./pages/Chat"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Finance = lazy(() => import("./pages/provider/Finance"));
const Premium = lazy(() => import("./pages/Premium"));
const ProviderOnboarding = lazy(() => import("./pages/provider/Onboarding"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/checkout/Success"));
const CheckoutCancel = lazy(() => import("./pages/checkout/Cancel"));
const KYCVerify = lazy(() => import("./pages/kyc/KYCVerify"));
const ImprovedDocumentsPage = lazy(() =>
  import("@/components/kyc/ImprovedDocumentsPage")
);

// 🔹 Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminKYCEnhanced = lazy(() => import("./pages/admin/KYCEnhanced"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminActivity = lazy(() => import("./pages/admin/Activity"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminEnhanced = lazy(() => import("./pages/admin/AdminEnhanced"));

// 🔹 Wrapper para rotas protegidas + KYC
const ProtectedWithKYC = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <KYCGate>{children}</KYCGate>
  </ProtectedRoute>
);

// 🔹 Loading fallback
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="jobfast-theme">
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/admin" element={<AdminLogin />} />

                {/* KYC routes */}
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

                {/* Protected + KYC */}
                <Route path="/dashboard" element={<ProtectedWithKYC><Dashboard /></ProtectedWithKYC>} />
                <Route path="/profile" element={<ProtectedWithKYC><Profile /></ProtectedWithKYC>} />
                <Route path="/profile/edit" element={<ProtectedWithKYC><ProfileEdit /></ProtectedWithKYC>} />
                <Route path="/jobs" element={<ProtectedWithKYC><Jobs /></ProtectedWithKYC>} />
                <Route path="/jobs/:id" element={<ProtectedWithKYC><JobDetails /></ProtectedWithKYC>} />
                <Route path="/jobs/in-progress" element={<ProtectedWithKYC><JobsInProgress /></ProtectedWithKYC>} />
                <Route path="/jobs/new" element={<ProtectedWithKYC><ProtectedJobCreation><JobNew /></ProtectedJobCreation></ProtectedWithKYC>} />
                <Route path="/jobs/:id/proposals" element={<ProtectedWithKYC><JobProposals /></ProtectedWithKYC>} />
                <Route path="/discover" element={<ProtectedProviderRoute><ProtectedWithKYC><Discover /></ProtectedWithKYC></ProtectedProviderRoute>} />
                <Route path="/providers/discover" element={<ProtectedClientRoute><ProtectedWithKYC><ProvidersDiscover /></ProtectedWithKYC></ProtectedClientRoute>} />
                <Route path="/chat" element={<ProtectedWithKYC><Chat /></ProtectedWithKYC>} />
                <Route path="/chat/:jobId" element={<ProtectedWithKYC><Chat /></ProtectedWithKYC>} />
                <Route path="/wallet" element={<ProtectedWithKYC><ClientWallet /></ProtectedWithKYC>} />
                <Route path="/profile/:userId" element={<ProtectedWithKYC><UserProfile /></ProtectedWithKYC>} />
                <Route path="/reviews" element={<ProtectedWithKYC><Reviews /></ProtectedWithKYC>} />
                <Route path="/contracts" element={<ProtectedWithKYC><Contracts /></ProtectedWithKYC>} />
                <Route path="/premium" element={<ProtectedWithKYC><Premium /></ProtectedWithKYC>} />
                <Route path="/help" element={<ProtectedWithKYC><HelpSupport /></ProtectedWithKYC>} />

                {/* Checkout */}
                <Route path="/checkout/:jobId" element={<ProtectedWithKYC><Checkout /></ProtectedWithKYC>} />
                <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
                <Route path="/checkout/cancel" element={<ProtectedRoute><CheckoutCancel /></ProtectedRoute>} />

                {/* Provider */}
                <Route path="/provider/onboarding" element={<ProtectedProviderRoute><ProtectedWithKYC><ProviderOnboarding /></ProtectedWithKYC></ProtectedProviderRoute>} />
                <Route path="/provider/finance" element={<ProtectedProviderRoute><ProtectedWithKYC><Finance /></ProtectedWithKYC></ProtectedProviderRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/kyc" element={<ProtectedRoute requiredRole="admin"><AdminKYCEnhanced /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/payments" element={<ProtectedRoute requiredRole="admin"><AdminPayments /></ProtectedRoute>} />
                <Route path="/admin/disputes" element={<ProtectedRoute requiredRole="admin"><AdminDisputes /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AdminAnalytics /></ProtectedRoute>} />
                <Route path="/admin/activity" element={<ProtectedRoute requiredRole="admin"><AdminActivity /></ProtectedRoute>} />
                <Route path="/admin/enhanced" element={<ProtectedRoute requiredRole="admin"><AdminEnhanced /></ProtectedRoute>} />

                {/* Not Found */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
