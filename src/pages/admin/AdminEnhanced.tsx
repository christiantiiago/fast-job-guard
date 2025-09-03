import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityDashboard } from '@/components/admin/ActivityDashboard';
import { FraudDetectionDashboard } from '@/components/admin/FraudDetectionDashboard';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAlertManagement } from '@/hooks/useAlertManagement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Bot,
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

export default function AdminEnhanced() {
  const { stats, loading: statsLoading } = useAdminStats();
  const { alerts, stats: alertStats } = useAlertManagement();

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

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Avançado - Sistema de Monitoramento
            </h1>
            <p className="text-muted-foreground">
              Painel completo com IA, detecção de fraudes e monitoramento em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Análise IA
            </Button>
            <Button size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alertas ({alertStats.active})
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                {stats?.totalJobs || 0} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume Financeiro</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats?.escrowAmount || 0)} em escrow
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{alertStats.active}</div>
              <p className="text-xs text-muted-foreground">
                {alertStats.critical} críticos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.pendingKyc || 0}</div>
              <p className="text-xs text-muted-foreground">
                Documentos para revisar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts Banner */}
        {alertStats.critical > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">
                    {alertStats.critical} Alerta{alertStats.critical > 1 ? 's' : ''} Crítico{alertStats.critical > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-red-700">
                    Requer atenção imediata - Possível fraude ou violação de segurança
                  </p>
                </div>
                <div className="flex gap-2">
                  {alerts.filter(a => a.severity === 'critical').slice(0, 3).map(alert => (
                    <Badge key={alert.id} variant="destructive" className="text-xs">
                      {alert.type}
                    </Badge>
                  ))}
                </div>
                <Button variant="destructive" size="sm">
                  Revisar Alertas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Atividade em Tempo Real
            </TabsTrigger>
            <TabsTrigger value="fraud" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Detecção de Fraudes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics Avançados
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Central de Alertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <ActivityDashboard />
          </TabsContent>

          <TabsContent value="fraud" className="space-y-6">
            <FraudDetectionDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analytics Avançados
                </CardTitle>
                <CardDescription>
                  Métricas detalhadas e insights de negócio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Analytics Avançados</h3>
                  <p className="mb-4">Dashboards detalhados com métricas de negócio, análise de cohort, previsões e insights com IA.</p>
                  <Button>Acessar Analytics Completo</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Central de Alertas Inteligentes
                </CardTitle>
                <CardDescription>
                  Sistema de alertas com IA para detecção proativa de problemas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {alert.type === 'security' && <Shield className="h-5 w-5 text-blue-500" />}
                        {alert.type === 'fraud' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {alert.type === 'system' && <Activity className="h-5 w-5 text-gray-500" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{alert.title}</h3>
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Investigar
                        </Button>
                        <Button variant="outline" size="sm">
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}

                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-500" />
                      <p>Nenhum alerta ativo - Sistema funcionando normalmente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🤖 IA e Automação</CardTitle>
              <CardDescription>
                Ferramentas inteligentes para otimizar operações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Bot className="h-4 w-4 mr-2" />
                Analisar Jobs com IA
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Verificação KYC Automática
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Previsões de Negócio
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🛡️ Segurança e Compliance</CardTitle>
              <CardDescription>
                Ferramentas de proteção e conformidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Auditoria de Segurança
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Análise de Comportamento
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Relatórios LGPD
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Business Intelligence</CardTitle>
              <CardDescription>
                Insights avançados para tomada de decisão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Dashboard Executivo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Análise Financeira
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="h-4 w-4 mr-2" />
                Performance de Mercado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}