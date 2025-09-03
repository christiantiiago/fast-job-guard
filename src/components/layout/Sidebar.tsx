import { useAuth } from '@/hooks/useAuth';
import { useLocation, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Activity
} from 'lucide-react';

const clientNavigation = [
  { name: 'Início', href: '/dashboard', icon: Home },
  { name: 'Meus Trabalhos', href: '/jobs', icon: Briefcase },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Carteira', href: '/wallet', icon: Wallet },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Perfil', href: '/profile', icon: User },
];

const providerNavigation = [
  { name: 'Início', href: '/dashboard', icon: Home },
  { name: 'Descobrir Jobs', href: '/discover', icon: Search },
  { name: 'Todos os Jobs', href: '/all-jobs', icon: Briefcase },
  { name: 'Meus Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Financeiro', href: '/provider/finance', icon: Wallet },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Perfil', href: '/profile', icon: User },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: Shield },
  { name: 'Usuários', href: '/admin/users', icon: User },
  { name: 'Atividades', href: '/admin/activity', icon: Activity },
  { name: 'Disputas', href: '/admin/disputes', icon: MessageCircle },
  { name: 'Pagamentos', href: '/admin/payments', icon: Wallet },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export const Sidebar = () => {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();

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
          <p className="text-sm font-medium text-foreground truncate">
            {user?.email}
          </p>
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
              Procurar Jobs
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