import { Home, Search, Briefcase, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userRole?: "client" | "provider" | "admin";
}

const MobileBottomNav = ({ activeTab = "home", onTabChange, userRole = "client" }: MobileBottomNavProps) => {
  const clientTabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "search", label: "Buscar", icon: Search },
    { id: "jobs", label: "Trabalhos", icon: Briefcase },
    { id: "messages", label: "Chat", icon: MessageCircle },
    { id: "profile", label: "Perfil", icon: User },
  ];

  const providerTabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "discover", label: "Descobrir", icon: Search },
    { id: "my-jobs", label: "Meus Jobs", icon: Briefcase },
    { id: "messages", label: "Chat", icon: MessageCircle },
    { id: "profile", label: "Perfil", icon: User },
  ];

  const tabs = userRole === "provider" ? providerTabs : clientTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 backdrop-blur-md lg:hidden">
      <div className="container-center px-0">
        <nav className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl transition-all duration-200",
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
                    isActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -top-0.5 w-8 h-0.5 primary-gradient rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MobileBottomNav;