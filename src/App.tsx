import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from '@/hooks/useAuth';

// Public pages
import Index from '@/pages/Index';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// Error pages
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />

                {/* Protected routes - All users */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Client routes */}
                <Route 
                  path="/jobs/new" 
                  element={
                    <ProtectedRoute requiredRole={['client']}>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Criar Novo Trabalho</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/jobs/:id" 
                  element={
                    <ProtectedRoute>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Detalhes do Trabalho</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />

                {/* Provider routes */}
                <Route 
                  path="/provider/onboarding" 
                  element={
                    <ProtectedRoute requiredRole={['provider']}>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Onboarding do Prestador</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/discover" 
                  element={
                    <ProtectedRoute requiredRole={['provider']}>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Descobrir Trabalhos</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />

                {/* Shared protected routes */}
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Perfil</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/messages" 
                  element={
                    <ProtectedRoute>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Mensagens</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />

                {/* Admin routes */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute adminOnly>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold mb-4">Painel Administrativo</h1>
                          <p className="text-muted-foreground">Esta página está em construção</p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } 
                />

                {/* Error pages */}
                <Route 
                  path="/403" 
                  element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4 text-destructive">403</h1>
                        <p className="text-muted-foreground">Acesso negado</p>
                      </div>
                    </div>
                  } 
                />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </div>
          </AuthProvider>

          <Toaster />
          <Sonner />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;