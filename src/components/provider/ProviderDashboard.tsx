import { useAuth } from '@/hooks/useAuth';
import { useJobStats } from '@/hooks/useJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  Briefcase,
  Clock,
  CheckCircle,
  Star,
  Eye,
  Plus,
  Activity,
  DollarSign,
  Calendar,
  MessageCircle,
  Award
} from 'lucide-react';

export function ProviderDashboard() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useJobStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (statsLoading) {
    return (
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-80" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activities = [
    {
      type: 'proposal',
      title: 'Nova proposta enviada',
      description: 'Instalação de sistema elétrico - R$ 1.200',
      time: '2 horas atrás',
      icon: Briefcase,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      type: 'payment',
      title: 'Pagamento recebido',
      description: 'Serviço de pintura - R$ 800',
      time: '1 dia atrás',
      icon: DollarSign,
      color: 'text-green-600 bg-green-100'
    },
    {
      type: 'review',
      title: 'Nova avaliação recebida',
      description: '5 estrelas - "Excelente trabalho!"',
      time: '2 dias atrás',
      icon: Star,
      color: 'text-yellow-600 bg-yellow-100'
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 primary-gradient opacity-90" />
        <div className="relative p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                Olá, {user?.email?.split('@')[0]}! 👋
              </h1>
              <p className="text-white/90 text-lg">
                Pronto para conquistar novos trabalhos hoje?
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-semibold">4.8 de avaliação</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>{stats?.completedJobs || 0} trabalhos concluídos</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Award className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link to="/discover">
                <Eye className="mr-2 h-5 w-5" />
                Descobrir Jobs
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
              <Link to="/provider/finance">
                <TrendingUp className="mr-2 h-5 w-5" />
                Financeiro
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Enviadas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.appliedJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde o mês passado
            </p>
            <Progress value={65} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Projetos ativos
            </p>
            <Progress value={45} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Taxa de sucesso: 98%
            </p>
            <Progress value={98} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.earnings || 0)}</div>
            <p className="text-xs text-muted-foreground">
              +20% este mês
            </p>
            <Progress value={75} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Performance & Activities */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Desempenho
            </CardTitle>
            <CardDescription>
              Sua performance este mês
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Aprovação</span>
                <span className="font-medium">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tempo de Resposta</span>
                <span className="font-medium">2h média</span>
              </div>
              <Progress value={90} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Satisfação Cliente</span>
                <span className="font-medium">4.8/5.0</span>
              </div>
              <Progress value={96} className="h-2" />
            </div>
            
            <div className="pt-4 border-t">
              <Button asChild variant="outline" className="w-full">
                <Link to="/reviews">
                  <Star className="mr-2 h-4 w-4" />
                  Ver Todas as Avaliações
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Suas últimas ações na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div key={index} className="flex gap-4">
                    <div className={`rounded-full p-2 ${activity.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="/jobs">
                <Briefcase className="mr-2 h-4 w-4" />
                Ver Todos os Trabalhos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/discover">
                <Eye className="h-6 w-6" />
                <span className="text-sm font-medium">Descobrir Jobs</span>
                <span className="text-xs text-muted-foreground">Encontre novas oportunidades</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/jobs">
                <Briefcase className="h-6 w-6" />
                <span className="text-sm font-medium">Meus Trabalhos</span>
                <span className="text-xs text-muted-foreground">Gerencie seus projetos</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/provider/finance">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm font-medium">Financeiro</span>
                <span className="text-xs text-muted-foreground">Ganhos e pagamentos</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/chat">
                <MessageCircle className="h-6 w-6" />
                <span className="text-sm font-medium">Mensagens</span>
                <span className="text-xs text-muted-foreground">Converse com clientes</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}