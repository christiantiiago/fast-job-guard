import { ReactNode } from 'react';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { FacialAuthModal } from '@/components/admin/FacialAuthModal';
import { PremiumPopup } from '@/components/premium/PremiumPopup';
import { useFacialAuth } from '@/hooks/useFacialAuth';
import { useAuth } from '@/hooks/useAuth';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { usePremiumPopup } from '@/hooks/usePremiumPopup';
import { KYCBanner } from '@/components/kyc/KYCBanner';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  showKYCBanner?: boolean;
}

export const AppLayout = ({ children, className, showKYCBanner = true }: AppLayoutProps) => {
  const { userRole } = useAuth();
  const { status } = useKYCStatus();
  const { showPopup, closePopup } = usePremiumPopup();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader showMenu={true} title="Início" />
      </div>

      {/* Main content */}
      <main className={cn(
        "pb-20 lg:pb-0 lg:pl-72", // pb-20 for mobile nav space
        className
      )}>
        <div className="min-h-screen">
          {/* KYC Banner */}
          {showKYCBanner && status && !status.isComplete && (
            <div className="p-4 border-b">
              <KYCBanner status={status} userRole={userRole} />
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <MobileBottomNav userRole={userRole as "client" | "provider" | "admin"} />
      </div>

      {/* Premium Popup */}
      <PremiumPopup isOpen={showPopup} onClose={closePopup} />
    </div>
  );
};