import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { AdvancedProviderDashboard } from '@/components/finance/AdvancedProviderDashboard';
import { ClientFinanceDashboard } from '@/components/finance/ClientFinanceDashboard';

export default function Wallet() {
  const { userRole } = useAuth();

  return (
    <AppLayout>
      <div className="p-6">
        {userRole === 'provider' ? (
          <AdvancedProviderDashboard />
        ) : (
          <ClientFinanceDashboard />
        )}
      </div>
    </AppLayout>
  );
}