import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  pendingKyc: number;
  totalJobs: number;
  totalRevenue: number;
  completedJobs: number;
}

interface MobileAdminStatsProps {
  stats: AdminStats | null;
  loading: boolean;
}

export const MobileAdminStats = ({ stats, loading }: MobileAdminStatsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-3 sm:p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded mb-1"></div>
              <div className="h-3 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Usuários",
      value: stats.totalUsers,
      subtitle: "Registrados",
      icon: Users,
      variant: "default" as const
    },
    {
      title: "KYC Pendente",
      value: stats.pendingKyc,
      subtitle: "Aguardando análise",
      icon: FileText,
      variant: "secondary" as const
    },
    {
      title: "Trabalhos Ativos",
      value: stats.totalJobs,
      subtitle: "Total na plataforma",
      icon: Briefcase,
      variant: "default" as const
    },
    {
      title: "Receita Total",
      value: formatCurrency(stats.totalRevenue),
      subtitle: "Arrecadado",
      icon: DollarSign,
      variant: "default" as const,
      isMonetary: true
    },
    {
      title: "Trabalhos Concluídos",
      value: stats.completedJobs,
      subtitle: "Finalizados",
      icon: CheckCircle,
      variant: "default" as const
    }
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-3 sm:p-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-1 sm:pt-2">
              <div className="text-lg sm:text-2xl font-bold">
                {stat.isMonetary ? stat.value : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.subtitle}
              </p>
              {stat.variant !== 'default' && (
                <Badge 
                  variant={stat.variant} 
                  className="mt-1 text-xs"
                >
                  {stat.variant === 'destructive' ? 'Atenção' : 'Aguardando'}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};