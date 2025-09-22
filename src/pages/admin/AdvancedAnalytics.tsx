import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { useJobFraudDetection } from '@/hooks/useJobFraudDetection';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { UserAnalyticsDashboard } from '@/components/admin/UserAnalyticsDashboard';
import { RealTimeActivityFeed } from '@/components/admin/RealTimeActivityFeed';
import { FraudDetectionDashboard } from '@/components/admin/FraudDetectionDashboard';
import { 
  Activity,
  AlertTriangle,
  Shield,
  Users,
  TrendingUp,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

export default function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const { 
    events: activities, 
    stats: activityStats, 
    loading: activityLoading 
  } = useRealTimeActivity();
  
  const { 
    suspiciousJobs, 
    stats: fraudStats, 
    loading: fraudLoading,
    refetch: refetchFraud 
  } = useJobFraudDetection();
  
  const { 
    logs, 
    loading: auditLoading,
    refetch: refetchAudit 
  } = useAuditLogs(50);

  const handleRefresh = () => {
    refetchFraud();
    refetchAudit();
  };

  const handleExport = () => {
    // Implementar exportação de dados
    console.log('Exportando dados de analytics...');
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Avançados</h1>
            <p className="text-muted-foreground">
              Monitoramento em tempo real e análise detalhada da plataforma
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Controles Globais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Controles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Buscar por usuário, evento, etc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Último dia</SelectItem>
                  <SelectItem value="7d">Última semana</SelectItem>
                  <SelectItem value="30d">Último mês</SelectItem>
                  <SelectItem value="90d">Últimos 3 meses</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  <SelectItem value="security">Segurança</SelectItem>
                  <SelectItem value="fraud">Fraude</SelectItem>
                  <SelectItem value="kyc">KYC</SelectItem>
                  <SelectItem value="payments">Pagamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Overview Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atividade Online</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activityStats?.totalEvents || 0}
              </div>
              <p className="text-xs text-muted-foreground">eventos hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas de Fraude</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {fraudStats?.totalFlagged || 0}
              </div>
              <p className="text-xs text-muted-foreground">jobs suspeitos detectados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos de Segurança</CardTitle>
              <Shield className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {logs?.filter(log => log.action.includes('SECURITY')).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">nas últimas 24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">84.2%</div>
              <p className="text-xs text-muted-foreground">jobs completados com sucesso</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principais */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="fraud">Fraude</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <RealTimeActivityFeed />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="fraud" className="space-y-6">
            <FraudDetectionDashboard />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Log de Auditoria
                </CardTitle>
                <CardDescription>
                  Histórico detalhado de todas as ações administrativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs?.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              log.action.includes('DELETE') ? 'destructive' :
                              log.action.includes('CREATE') ? 'default' :
                              log.action.includes('UPDATE') ? 'secondary' : 'outline'
                            }>
                              {log.action}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {log.entity_type}
                            </span>
                          </div>
                          <p className="text-sm">
                            {log.user_email || 'Sistema'} realizou: {log.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Performance</CardTitle>
                  <CardDescription>
                    Tempo de resposta e uso de recursos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tempo médio de resposta</span>
                      <Badge variant="secondary">245ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Uso de memória</span>
                      <Badge variant="secondary">68%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Requests por minuto</span>
                      <Badge variant="secondary">1,247</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status dos Serviços</CardTitle>
                  <CardDescription>
                    Monitoramento dos sistemas críticos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Principal</span>
                      <Badge className="bg-success text-success-foreground">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Processamento de Pagamentos</span>
                      <Badge className="bg-success text-success-foreground">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sistema de Notificações</span>
                      <Badge className="bg-warning text-warning-foreground">Degradado</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Edge Functions</span>
                      <Badge className="bg-success text-success-foreground">Online</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}