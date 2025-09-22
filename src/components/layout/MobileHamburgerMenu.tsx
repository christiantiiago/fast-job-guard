import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { NavLink, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { cn } from '@/lib/utils';
import {
  Menu,
  Home,
  Search,
  Briefcase,
  MessageCircle,
  User,
  Wallet,
  Settings,
  Shield,
  Users,
  Activity,
  FileText,
  Star,
  LogOut,
  TrendingUp,
  CreditCard,
  UserCheck,
  Crown,
  Bell
} from 'lucide-react';

export function MobileHamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const { premiumStatus } = usePremiumStatus();
  const location = useLocation();

  const clientNavigation = [
    { name: 'Início', href: '/dashboard', icon: Home },
    { name: 'Trabalhos', href: '/jobs', icon: Briefcase },
    { name: 'Descobrir Prestadores', href: '/providers/discover', icon: Search },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Contratos', href: '/contracts', icon: FileText },
    { name: 'Carteira', href: '/wallet', icon: Wallet },
    { name: 'Avaliações', href: '/reviews', icon: Star },
    { name: 'Documentos', href: '/kyc/documents', icon: FileText },
    { name: 'Ajuda e Suporte', href: '/help', icon: Settings },
    { name: 'Perfil', href: '/profile', icon: User },
  ];

  const providerNavigation = [
    { name: 'Início', href: '/dashboard', icon: Home },
    { name: 'Descobrir Trabalhos', href: '/discover', icon: Search },
    { name: 'Meus Trabalhos', href: '/jobs', icon: Briefcase },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Contratos', href: '/contracts', icon: FileText },
    { name: 'Financeiro', href: '/provider/finance', icon: TrendingUp },
    { name: 'Avaliações', href: '/reviews', icon: Star },
    { name: 'Documentos', href: '/kyc/documents', icon: FileText },
    { name: 'Premium', href: '/premium', icon: Crown },
    { name: 'Ajuda e Suporte', href: '/help', icon: Settings },
    { name: 'Perfil', href: '/profile', icon: User },
  ];

  const adminNavigation = [
    { name: 'Dashboard', href: '/admin', icon: Shield },
    { name: 'Admin Avançado', href: '/admin/enhanced', icon: Activity },
    { name: 'Usuários', href: '/admin/users', icon: Users },
    { name: 'KYC', href: '/admin/kyc', icon: UserCheck },
    { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Atividades', href: '/admin/activity', icon: Activity },
    { name: 'Disputas', href: '/admin/disputes', icon: MessageCircle },
    { name: 'Pagamentos', href: '/admin/payments', icon: CreditCard },
    { name: 'Configurações', href: '/admin/settings', icon: Settings },
    { name: 'Relatório do Sistema', href: '/system-report', icon: FileText },
    { name: 'Ajuda e Suporte', href: '/help', icon: Settings },
  ];

  const getNavigation = () => {
    switch (userRole) {
      case 'admin':
        return adminNavigation;
      case 'provider':
        return providerNavigation;
      default:
        return clientNavigation;
    }
  };

  const navigation = getNavigation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="text-left">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg primary-gradient flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="font-bold text-lg">Job Fast</span>
              </div>
            </SheetTitle>
            
            {user && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{user.email?.split('@')[0]}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {userRole === 'client' ? 'Cliente' : userRole === 'provider' ? 'Prestador' : 'Admin'}
                      </Badge>
                      {premiumStatus.is_premium && (
                        <Crown className="h-3 w-3 text-accent" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Botão Premium apenas para prestadores não-premium */}
                {!premiumStatus.is_premium && userRole === 'provider' && (
                  <Button
                    asChild
                    className="w-full justify-start bg-gradient-to-r from-accent to-accent/80 text-white hover:from-accent/90 hover:to-accent/70"
                    size="sm"
                  >
                    <NavLink to="/premium" onClick={() => setOpen(false)}>
                      <Crown className="mr-2 h-4 w-4" />
                      Tornar-se Premium
                    </NavLink>
                  </Button>
                )}
              </div>
            )}
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-3">
            <nav className="space-y-1 py-4">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.href);
                
                return (
                  <SheetClose key={item.name} asChild>
                    <NavLink
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                      {item.name}
                      {active && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-current" />
                      )}
                    </NavLink>
                  </SheetClose>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tema</span>
              <ThemeToggle />
            </div>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}