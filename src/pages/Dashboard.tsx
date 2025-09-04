import { useAuth } from '@/hooks/useAuth';
import { useJobStats } from '@/hooks/useJobs';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star,
  MapPin,
  TrendingUp,
  Shield
} from 'lucide-react';

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const { stats, loading: statsLoading } = useJobStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (statsLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-32" />
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
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {userRole === 'client' 
                ? `Olá, ${user?.email?.split('@')[0]}! 👋 Vamos criar seu próximo projeto?`
                : userRole === 'provider'
                ? `Olá, ${user?.email?.split('@')[0]}! 👋 Pronto para novos trabalhos?`
                : `Painel Administrativo - ${user?.email?.split('@')[0]}`
              }
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'client' 
                ? 'Publique trabalhos, encontre profissionais qualificados e gerencie seus projetos com facilidade'
                : userRole === 'provider'
                ? 'Descubra oportunidades próximas a você, envie propostas e construa sua reputação'
                : 'Gerencie usuários, monitore atividades e mantenha a plataforma funcionando perfeitamente'
              }
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {userRole === 'client' && (
              <>
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/jobs/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Job
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to="/jobs">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Meus Jobs
                  </Link>
                </Button>
              </>
            )}
            {userRole === 'provider' && (
              <>
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/discover">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Descobrir Jobs
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to="/jobs">
                    <Clock className="mr-2 h-4 w-4" />
                    Meus Trabalhos
                  </Link>
                </Button>
              </>
            )}
            {userRole === 'admin' && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/admin">
                  <Shield className="mr-2 h-4 w-4" />
                  Painel Admin
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userRole === 'client' && stats ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Total publicados
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
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
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Finalizados
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abertos</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.openJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando propostas
                  </p>
                </CardContent>
              </Card>
            </>
          ) : userRole === 'provider' && stats ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jobs Aplicados</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.appliedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Propostas enviadas
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
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
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Trabalhos finalizados
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganhos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.earnings)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total recebido
                  </p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Quick Links */}
        <div className="grid gap-6 lg:grid-cols-2">
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
                    <Link to="/discover">
                      <Star className="mr-2 h-4 w-4" />
                      Ver trabalhos públicos
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/wallet">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Ver carteira
                    </Link>
                  </Button>
                </>
              ) : userRole === 'provider' ? (
                <>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/discover">
                      <Briefcase className="mr-2 h-4 w-4" />
                      Descobrir trabalhos
                    </Link>
                  </Button>
                   <Button asChild variant="outline" className="w-full justify-start">
                     <Link to="/jobs">
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
              ) : null}
            </CardContent>
          </Card>

          {/* Recent Activity Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Últimas Atividades
              </CardTitle>
              <CardDescription>
                Suas ações mais recentes na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}