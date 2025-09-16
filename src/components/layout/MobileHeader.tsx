import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Menu, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileHamburgerMenu } from "./MobileHamburgerMenu";
import { ChatHeaderButton } from "./ChatHeaderButton";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
  onBack?: () => void;
  onMenu?: () => void;
  onNotifications?: () => void;
  onSearch?: () => void;
  notificationCount?: number;
  className?: string;
  children?: React.ReactNode;
  transparent?: boolean;
}

const MobileHeader = ({
  title,
  showBack = false,
  showMenu = false,
  showNotifications = false,
  showSearch = false,
  onBack,
  onMenu,
  onNotifications,
  onSearch,
  notificationCount = 0,
  className,
  children,
  transparent = false
}: MobileHeaderProps) => {
  
  return (
    <header className={cn(
      "sticky top-0 z-40 border-b border-border/50",
      transparent 
        ? "bg-background/80 backdrop-blur-md" 
        : "bg-background",
      className
    )}>
      <div className="container-center">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="w-10 h-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            
            {showMenu && <MobileHamburgerMenu />}
            
            {title && (
              <h1 className="text-lg font-semibold text-foreground truncate">
                {title}
              </h1>
            )}
          </div>

          {/* Center content */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <ChatHeaderButton />
            
            {showSearch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearch}
                className="w-10 h-10"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;