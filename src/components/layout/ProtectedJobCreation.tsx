import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface ProtectedJobCreationProps {
  children: ReactNode;
}

export const ProtectedJobCreation = ({ children }: ProtectedJobCreationProps) => {
  const { userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && userRole === 'provider') {
      toast.error('Apenas clientes podem criar trabalhos', {
        description: 'Prestadores podem descobrir e se candidatar a trabalhos existentes.'
      });
    }
  }, [userRole, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'client') {
    return <Navigate to="/discover" replace />;
  }

  return <>{children}</>;
};