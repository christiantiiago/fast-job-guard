import { useAuth } from '@/hooks/useAuth';
import { useLocation, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import {
  Home, 
  Briefcase, 
  MessageCircle, 
  Wallet, 
  User, 
  Search,
  Plus,
  Settings,
  Shield,
  LogOut,
  Star,
  Activity,
  BarChart,
  FileText,
  Crown,
  HelpCircle
} from 'lucide-react';

const clientNavigation = [
  { name: 'Início', href: '/dashboard', icon: Home },
  { name: 'Meus Trabalhos', href: '/jobs', icon: Briefcase },
  { name: 'Descobrir Prestadores', href: '/providers/discover', icon: Search },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Contratos', href: '/contracts', icon: FileText },
  { name: 'Meus Documentos', href: '/kyc/documents', icon: FileText },
  { name: 'Carteira', href: '/wallet', icon: Wallet },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Ajuda e Suporte', href: '/help', icon: HelpCircle },
  { name: 'Perfil', href: '/profile', icon: User },
];

const providerNavigation = [
  { name: 'Início', href: '/dashboard', icon: Home },
  { name: 'Descobrir Trabalhos', href: '/discover', icon: Search },
  { name: 'Meus Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Contratos', href: '/contracts', icon: FileText },
  { name: 'Meus Documentos', href: '/kyc/documents', icon: FileText },
  { name: 'Financeiro', href: '/provider/finance', icon: Wallet },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Ajuda e Suporte', href: '/help', icon: HelpCircle },
  { name: 'Perfil', href: '/profile', icon: User },
];

const adminNavigation = [
  { name: 'Dashboard Admin', href: '/admin', icon: Shield },
  { name: 'Admin Avançado', href: '/admin/enhanced', icon: Activity },
  { name: 'Usuários', href: '/admin/users', icon: User },
  { name: 'KYC', href: '/admin/kyc', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
  { name: 'Atividades', href: '/admin/activity', icon: Activity },
  { name: 'Disputas', href: '/admin/disputes', icon: MessageCircle },
  { name: 'Pagamentos', href: '/admin/payments', icon: Wallet },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
  { name: '--- PÁGINAS DE USUÁRIO ---', href: '', icon: Settings, isHeader: true },
  { name: 'Dashboard Cliente', href: '/dashboard', icon: Home },
  { name: 'Descobrir Prestadores', href: '/providers/discover', icon: Search },
  { name: 'Descobrir Trabalhos', href: '/discover', icon: Search },
  { name: 'Trabalhos', href: '/jobs', icon: Briefcase },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Financeiro Prestador', href: '/provider/finance', icon: Wallet },
];

export const Sidebar = () => {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const { premiumStatus } = usePremiumStatus();

  const navigation = userRole === 'admin' 
    ? adminNavigation 
    : userRole === 'provider' 
    ? providerNavigation 
    : clientNavigation;

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">Job Fast</span>
          </div>
        </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email}
            </p>
            {premiumStatus.is_premium && (
              <Crown className="h-3 w-3 text-accent" />
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {userRole}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {userRole === 'client' && (
        <div className="space-y-2">
          <Button asChild className="w-full justify-start" size="sm">
            <NavLink to="/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar Job
            </NavLink>
          </Button>
        </div>
      )}

      {userRole === 'provider' && (
        <div className="space-y-2">
          <Button asChild variant="outline" className="w-full justify-start" size="sm">
            <NavLink to="/discover">
              <Search className="mr-2 h-4 w-4" />
              Descobrir Trabalhos  
            </NavLink>
          </Button>
        </div>
      )}

      {userRole === 'client' && (
        <div className="space-y-2">
          <Button asChild variant="outline" className="w-full justify-start" size="sm">
            <NavLink to="/providers/discover">
              <Search className="mr-2 h-4 w-4" />
              Descobrir Prestadores  
            </NavLink>
          </Button>
        </div>
      )}

      {/* Premium Button for non-premium users */}
      {!premiumStatus.is_premium && userRole !== 'admin' && (
        <div className="space-y-2">
          <Button asChild className="w-full justify-start bg-gradient-to-r from-accent to-accent/80 text-white hover:from-accent/90 hover:to-accent/70" size="sm">
            <NavLink to="/premium">
              <Crown className="mr-2 h-4 w-4" />
              Tornar-se Premium
            </NavLink>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                // @ts-ignore
                if (item.isHeader) {
                  return (
                    <li key={item.name} className="pt-4">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                        {item.name}
                      </div>
                    </li>
                  );
                }
                
                if (!item.href) return null;
                
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={cn(
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.name}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </li>
          
          {/* Bottom actions */}
          <li className="mt-auto">
            <Button 
              variant="ghost" 
              onClick={signOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
};