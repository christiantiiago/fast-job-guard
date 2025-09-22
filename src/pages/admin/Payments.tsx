import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { EscrowReleaseManager } from '@/components/admin/EscrowReleaseManager';

export default function AdminPayments() {
  const { userRole } = useAuth();
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Pagamentos</h1>
            {/* Add escrow manager for admin purposes */}
            {userRole === 'admin' && (
              <div className="mt-6">
                <EscrowReleaseManager />
              </div>
            )}
      </div>
    </AppLayout>
  );
}