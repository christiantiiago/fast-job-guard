import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export const AppLayout = ({ children, className }: AppLayoutProps) => {
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader />
      </div>

      {/* Main content */}
      <main className={cn(
        "pb-20 lg:pb-0 lg:pl-72", // pb-20 for mobile nav space
        className
      )}>
        <div className="min-h-screen">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <MobileBottomNav userRole={userRole as "client" | "provider" | "admin"} />
      </div>
    </div>
  );
};