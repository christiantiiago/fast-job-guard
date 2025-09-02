import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star,
  MapPin,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const { user, userRole } = useAuth();

  // Mock data - in real app would come from API
  const stats = {
    client: {
      totalJobs: 12,
      activeJobs: 3,
      completedJobs: 8,
      pendingApproval: 1
    },
    provider: {
      appliedJobs: 25,
      activeJobs: 2,
      completedJobs: 18,
      earnings: 'R$ 2.450'
    }
  };

  const recentJobs = [
    {
      id: '1',
      title: 'Instalação de ar condicionado',
      status: 'em_andamento',
      budget: 'R$ 300',
      location: 'São Paulo, SP',
      date: '2 horas atrás'
    },
    {
      id: '2',
      title: 'Reparo em encanamento',
      status: 'concluido',
      budget: 'R$ 150',
      location: 'Rio de Janeiro, RJ',
      date: '1 dia atrás'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      'aberto': 'default',
      'em_andamento': 'secondary',
      'concluido': 'default',
      'cancelado': 'destructive'
    };
    
    const labels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em andamento',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'client' 
                ? 'Gerencie seus trabalhos e encontre os melhores profissionais'
                : userRole === 'provider'
                ? 'Encontre novos trabalhos e gerencie seus serviços'
                : 'Painel administrativo do Job Fast'
              }
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {userRole === 'client' && (
              <Button asChild>
                <Link to="/jobs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Job
                </Link>
              </Button>
            )}
            {userRole === 'provider' && (
              <Button asChild variant="outline">
                <Link to="/discover">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Procurar Jobs
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userRole === 'client' ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.client.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    +2 este mês
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.client.activeJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Projetos ativos
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.client.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Taxa de 95% satisfação
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.client.pendingApproval}</div>
                  <p className="text-xs text-muted-foreground">
                    Para aprovação
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jobs Aplicados</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.provider.appliedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    +3 esta semana
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.provider.activeJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Projetos ativos
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.provider.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Rating 4.8/5
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganhos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.provider.earnings}</div>
                  <p className="text-xs text-muted-foreground">
                    +12% este mês
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Trabalhos Recentes
              </CardTitle>
              <CardDescription>
                {userRole === 'client' 
                  ? 'Seus últimos trabalhos publicados'
                  : 'Jobs que você aplicou recentemente'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">{job.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </div>
                    <p className="text-xs text-muted-foreground">{job.date}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-medium text-sm">{job.budget}</div>
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/jobs">Ver todos os trabalhos</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Links / Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Acesse rapidamente as funcionalidades principais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userRole === 'client' ? (
                <>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/jobs/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar novo trabalho
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/jobs">
                      <Briefcase className="mr-2 h-4 w-4" />
                      Gerenciar trabalhos
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/wallet">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Ver carteira
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/discover">
                      <Briefcase className="mr-2 h-4 w-4" />
                      Descobrir trabalhos
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/provider/jobs">
                      <Clock className="mr-2 h-4 w-4" />
                      Meus trabalhos
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/provider/finance">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Financeiro
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}