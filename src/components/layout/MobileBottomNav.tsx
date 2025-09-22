import { Home, Search, Briefcase, MessageCircle, User, Wallet, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useAuth } from "@/hooks/useAuth";

interface MobileBottomNavProps {
  userRole?: "client" | "provider" | "admin";
}

const MobileBottomNav = ({ userRole = "client" }: MobileBottomNavProps) => {
  const location = useLocation();
  const { premiumStatus } = usePremiumStatus();
  const { user } = useAuth();
  
  const clientTabs = [
    { id: "home", label: "Início", icon: Home, href: "/dashboard" },
    { id: "discover", label: "Prestadores", icon: Search, href: "/providers/discover" },
    { id: "jobs", label: "Trabalhos", icon: Briefcase, href: "/jobs" },
    { id: "messages", label: "Chat", icon: MessageCircle, href: "/chat" },
    { id: "wallet", label: "Carteira", icon: Wallet, href: "/wallet" },
  ];

  const providerTabs = [
    { id: "home", label: "Início", icon: Home, href: "/dashboard" },
    { id: "discover", label: "Descobrir", icon: Search, href: "/discover" },
    { id: "jobs", label: "Trabalhos", icon: Briefcase, href: "/jobs" },
    { id: "messages", label: "Chat", icon: MessageCircle, href: "/chat" },
    { id: "wallet", label: "Carteira", icon: Wallet, href: "/provider/finance" },
  ];

  // Show premium tab for non-premium providers only
  const shouldShowPremium = !premiumStatus.is_premium && userRole === 'provider';
  
  let tabs = userRole === "provider" ? providerTabs : clientTabs;
  
  if (shouldShowPremium) {
    tabs = [...tabs.slice(0, 4), { id: "premium", label: "Premium", icon: Crown, href: "/premium" }];
  } else {
    tabs = [...tabs, { id: "profile", label: "Perfil", icon: User, href: "/profile" }];
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 backdrop-blur-md lg:hidden">
      <div className="container-center px-0">
        <nav className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = location.pathname === tab.href;
            
            return (
              <NavLink
                key={tab.id}
                to={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 relative",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <IconComponent className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive && "scale-110",
                    tab.id === 'premium' && "text-accent"
                  )} />
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold",
                  tab.id === 'premium' && "text-accent"
                )}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -top-0.5 w-8 h-0.5 primary-gradient rounded-full" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MobileBottomNav;