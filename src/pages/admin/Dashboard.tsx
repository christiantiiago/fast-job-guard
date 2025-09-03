import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';

export default function AdminDashboard() {
  // Dados mock para demonstração
  const stats = {
    totalUsers: 1245,
    newUsersThisMonth: 89,
    totalJobs: 543,
    activeJobs: 127,
    completedJobs: 389,
    totalRevenue: 45678.90,
    escrowAmount: 12345.67,
    openDisputes: 8
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Gerencie usuários, jobs, pagamentos e disputas da plataforma
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsersThisMonth} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs Ativos</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalJobs} total de jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume em Escrow</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.escrowAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalRevenue)} receita total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disputas Abertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.openDisputes}</div>
              <p className="text-xs text-muted-foreground">
                Requer atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Aprovar documentos KYC e gerenciar permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pendentes KYC:</span>
                  <Badge variant="outline">15</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Alterações pendentes:</span>
                  <Badge variant="outline">3</Badge>
                </div>
              </div>
              <Button asChild className="w-full mt-4">
                <Link to="/admin/users">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Usuários
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagamentos
              </CardTitle>
              <CardDescription>
                Gerenciar transações e liberações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pendentes:</span>
                  <Badge variant="secondary">12</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Em hold:</span>
                  <Badge variant="outline">{formatCurrency(stats.escrowAmount)}</Badge>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/admin/payments">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Pagamentos
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Disputas
              </CardTitle>
              <CardDescription>
                Resolver conflitos entre usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Abertas:</span>
                  <Badge variant="destructive">{stats.openDisputes}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Urgentes:</span>
                  <Badge variant="destructive">3</Badge>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/admin/disputes">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Disputas
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas ações na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Job concluído</p>
                  <p className="text-xs text-muted-foreground">João completou "Instalação Elétrica" - há 2min</p>
                </div>
                <Badge variant="secondary">+{formatCurrency(250)}</Badge>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo usuário</p>
                  <p className="text-xs text-muted-foreground">Maria se cadastrou como prestadora - há 15min</p>
                </div>
                <Badge variant="outline">KYC Pendente</Badge>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Disputa aberta</p>
                  <p className="text-xs text-muted-foreground">Carlos vs. Ana - "Serviço de Limpeza" - há 1h</p>
                </div>
                <Badge variant="destructive">Urgente</Badge>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Pagamento liberado</p>
                  <p className="text-xs text-muted-foreground">Transferência para Pedro aprovada - há 2h</p>
                </div>
                <Badge variant="secondary">-{formatCurrency(180)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}