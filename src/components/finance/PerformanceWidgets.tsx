import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Star, 
  Calendar,
  Zap,
  Users,
  Clock
} from 'lucide-react';

interface PerformanceWidgetsProps {
  stats: {
    totalEarnings: number;
    currentMonthEarnings: number;
    avgRating: number;
    totalJobs: number;
    availableBalance: number;
  };
  showBalance: boolean;
  isPremium: boolean;
  detailed?: boolean;
}

export function PerformanceWidgets({ stats, showBalance, isPremium, detailed = false }: PerformanceWidgetsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular métricas de performance
  const monthlyGoal = 5000; // Meta mensal padrão
  const goalProgress = (stats.currentMonthEarnings / monthlyGoal) * 100;
  const avgJobValue = stats.totalJobs > 0 ? stats.totalEarnings / stats.totalJobs : 0;
  const performanceScore = Math.min((stats.avgRating * 20), 100);

  // Simular dados de crescimento (seria calculado com dados reais)
  const growthRate = 15.3; // 15.3% de crescimento
  const isPositiveGrowth = growthRate > 0;

  const widgets = [
    // Widget de Meta Mensal
    {
      title: 'Meta Mensal',
      value: showBalance ? formatCurrency(stats.currentMonthEarnings) : '••••••',
      target: formatCurrency(monthlyGoal),
      progress: Math.min(goalProgress, 100),
      icon: Target,
      color: goalProgress >= 80 ? 'text-success' : goalProgress >= 50 ? 'text-warning' : 'text-muted-foreground',
      bgColor: goalProgress >= 80 ? 'bg-success/10' : goalProgress >= 50 ? 'bg-warning/10' : 'bg-muted/10'
    },
    // Widget de Performance Score
    {
      title: 'Score de Performance',
      value: `${Math.round(performanceScore)}%`,
      subtitle: `Baseado em ${stats.totalJobs} trabalhos`,
      progress: performanceScore,
      icon: Award,
      color: performanceScore >= 80 ? 'text-success' : performanceScore >= 60 ? 'text-warning' : 'text-muted-foreground',
      bgColor: performanceScore >= 80 ? 'bg-success/10' : performanceScore >= 60 ? 'bg-warning/10' : 'bg-muted/10'
    },
    // Widget de Crescimento
    {
      title: 'Crescimento',
      value: `${isPositiveGrowth ? '+' : ''}${growthRate.toFixed(1)}%`,
      subtitle: 'vs. mês anterior',
      icon: isPositiveGrowth ? TrendingUp : TrendingDown,
      color: isPositiveGrowth ? 'text-success' : 'text-destructive',
      bgColor: isPositiveGrowth ? 'bg-success/10' : 'bg-destructive/10'
    },
    // Widget de Ticket Médio
    {
      title: 'Ticket Médio',
      value: showBalance ? formatCurrency(avgJobValue) : '••••••',
      subtitle: `${stats.totalJobs} trabalhos`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  if (detailed) {
    // Adicionar widgets extras para a aba analytics
    widgets.push(
      {
        title: 'Avaliação Média',
        value: stats.avgRating.toFixed(1),
        subtitle: 'Nota dos clientes',
        icon: Star,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10'
      },
      {
        title: 'Tempo Resposta',
        value: '2.3h',
        subtitle: 'Tempo médio de resposta',
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10'
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Widgets de Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {widgets.map((widget, index) => {
          const Icon = widget.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <div className={`absolute inset-0 ${widget.bgColor}`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                <div className={`p-2 ${widget.bgColor} rounded-lg`}>
                  <Icon className={`h-4 w-4 ${widget.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className={`text-2xl font-bold ${widget.color} mb-1`}>
                  {widget.value}
                </div>
                {widget.subtitle && (
                  <p className="text-xs text-muted-foreground">{widget.subtitle}</p>
                )}
                {widget.target && (
                  <p className="text-xs text-muted-foreground">Meta: {widget.target}</p>
                )}
                {widget.progress !== undefined && (
                  <div className="mt-3">
                    <Progress value={widget.progress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Premium */}
      {isPremium && (
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Status Premium Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-sm font-medium text-amber-600">Taxa Reduzida</p>
                <p className="text-2xl font-bold text-amber-600">5%</p>
                <p className="text-xs text-muted-foreground">vs 7.5% padrão</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-sm font-medium text-amber-600">Prioridade</p>
                <p className="text-2xl font-bold text-amber-600">+50%</p>
                <p className="text-xs text-muted-foreground">Mais visualizações</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-sm font-medium text-amber-600">Suporte</p>
                <p className="text-2xl font-bold text-amber-600">24/7</p>
                <p className="text-xs text-muted-foreground">Atendimento VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dicas de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Dicas para Aumentar seus Ganhos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-success/10 rounded">
                <Star className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Mantenha sua avaliação alta</p>
                <p className="text-xs text-muted-foreground">
                  Avaliações 4.5+ recebem 30% mais propostas
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-primary/10 rounded">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Responda rapidamente</p>
                <p className="text-xs text-muted-foreground">
                  Tempo de resposta &lt; 2h aumenta conversão
                </p>
              </div>
            </div>

            {!isPremium && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="p-1 bg-amber-500/10 rounded">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Considere o Premium</p>
                  <p className="text-xs text-muted-foreground">
                    Taxa reduzida e prioridade nos resultados
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-blue-500/10 rounded">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Complete seu perfil</p>
                <p className="text-xs text-muted-foreground">
                  Perfis completos têm 2x mais propostas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}