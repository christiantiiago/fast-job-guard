import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  className?: string;
}

const StatCard = ({ title, value, icon: Icon, trend, gradient = "primary-gradient", className }: StatCardProps) => (
  <Card className={cn("border-0 shadow-card overflow-hidden", className)}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              trend.isPositive ? "text-secondary" : "text-destructive"
            )}>
              <TrendingUp className={cn(
                "w-3 h-3",
                !trend.isPositive && "rotate-180"
              )} />
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface DashboardStatsProps {
  userRole: "client" | "provider" | "admin";
  stats?: {
    activeJobs?: number;
    completedJobs?: number;
    totalEarnings?: number;
    avgRating?: number;
    pendingProposals?: number;
    totalSpent?: number;
  };
}

const DashboardStats = ({ userRole, stats = {} }: DashboardStatsProps) => {
  const clientStats = [
    {
      title: "Trabalhos Ativos",
      value: stats.activeJobs || 0,
      icon: Clock,
      gradient: "primary-gradient",
      trend: { value: 12, isPositive: true }
    },
    {
      title: "Concluídos",
      value: stats.completedJobs || 0,
      icon: CheckCircle,
      gradient: "success-gradient"
    },
    {
      title: "Total Gasto",
      value: `R$ ${(stats.totalSpent || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      gradient: "accent-gradient"
    },
    {
      title: "Propostas Pendentes",
      value: stats.pendingProposals || 0,
      icon: TrendingUp,
      gradient: "primary-gradient"
    }
  ];

  const providerStats = [
    {
      title: "Trabalhos Ativos",
      value: stats.activeJobs || 0,
      icon: Clock,
      gradient: "primary-gradient",
      trend: { value: 8, isPositive: true }
    },
    {
      title: "Concluídos",
      value: stats.completedJobs || 0,
      icon: CheckCircle,
      gradient: "success-gradient"
    },
    {
      title: "Ganhos Totais",
      value: `R$ ${(stats.totalEarnings || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      gradient: "accent-gradient",
      trend: { value: 15, isPositive: true }
    },
    {
      title: "Avaliação Média",
      value: stats.avgRating || "5.0",
      icon: TrendingUp,
      gradient: "success-gradient"
    }
  ];

  const currentStats = userRole === "provider" ? providerStats : clientStats;

  return (
    <div className="mobile-grid">
      {currentStats.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          className="animate-scale-in"
        />
      ))}
    </div>
  );
};

export default DashboardStats;