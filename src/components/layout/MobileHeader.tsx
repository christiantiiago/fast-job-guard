import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Menu, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
            
            {showMenu && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenu}
                className="w-10 h-10"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            
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
            
            {showNotifications && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNotifications}
                className="w-10 h-10 relative"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs primary-gradient text-white border-0"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;