import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useFacialAuth } from '@/hooks/useFacialAuth';
import { FacialAuthModal } from '@/components/admin/FacialAuthModal';
import { useEffect, useState } from 'react';
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
  Eye,
  Activity,
  UserPlus,
  Zap
} from 'lucide-react';

export default function AdminDashboard() {
  const { stats, loading, error, refetch } = useAdminStats();
  const { logs, loading: logsLoading } = useAuditLogs(10);
  const { triggerRandomVerification, checkVerificationNeeded } = useFacialAuth();
  const [showFacialAuth, setShowFacialAuth] = useState(false);
  const [facialAuthReason, setFacialAuthReason] = useState('');

  // Verificar se precisa de autenticação facial
  useEffect(() => {
    const needsVerification = checkVerificationNeeded();
    if (needsVerification) {
      setFacialAuthReason('Verificação periódica de segurança');
      setShowFacialAuth(true);
    }
  }, [checkVerificationNeeded]);

  // Trigger verificação aleatória em ações críticas
  const handleCriticalAction = (action: string) => {
    const needsRandom = triggerRandomVerification();
    if (needsRandom) {
      setFacialAuthReason(`Verificação de segurança para: ${action}`);
      setShowFacialAuth(true);
      return false;
    }
    return true;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
      case 'user_created':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'update':
      case 'profile_updated':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'facial_verification':
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold">Erro ao carregar dashboard</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => refetch()}>Tentar Novamente</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

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
              <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.newUsersThisMonth || 0} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs Ativos</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalJobs || 0} total de jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume em Escrow</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.escrowAmount || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats?.totalRevenue || 0)} receita total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disputas Abertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.openDisputes || 0}</div>
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
                  <Badge variant="outline">{stats?.pendingKyc || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Admins:</span>
                  <Badge variant="outline">{stats?.totalAdmins || 0}</Badge>
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
                  <span>Em Escrow:</span>
                  <Badge variant="secondary">{formatCurrency(stats?.escrowAmount || 0)}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Receita Total:</span>
                  <Badge variant="outline">{formatCurrency(stats?.totalRevenue || 0)}</Badge>
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
                  <Badge variant="destructive">{stats?.openDisputes || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Jobs Ativos:</span>
                  <Badge variant="secondary">{stats?.activeJobs || 0}</Badge>
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
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 w-16 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-4">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-3">
                    {getActionIcon(log.action)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user_name} - {formatDate(log.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.entity_type}
                    </Badge>
                  </div>
                ))}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/admin/activity">Ver Todas Atividades</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Facial Auth Modal */}
        <FacialAuthModal
          isOpen={showFacialAuth}
          onClose={() => setShowFacialAuth(false)}
          onSuccess={() => {
            setShowFacialAuth(false);
            // Continuar com ação original se necessário
          }}
          reason={facialAuthReason}
        />
      </div>
    </AppLayout>
  );
}