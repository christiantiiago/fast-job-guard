import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { ProviderFinanceDashboard } from '@/components/finance/ProviderFinanceDashboard';
import { ClientFinanceDashboard } from '@/components/finance/ClientFinanceDashboard';

export default function Wallet() {
  const { userRole } = useAuth();

  return (
    <AppLayout>
      <div className="p-6">
        {userRole === 'provider' ? (
          <ProviderFinanceDashboard />
        ) : (
          <ClientFinanceDashboard />
        )}
      </div>
    </AppLayout>
  );
}