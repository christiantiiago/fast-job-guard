import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealTimeUsers } from '@/hooks/useRealTimeUsers';
import { useAdminStats } from '@/hooks/useAdminStats';
import { 
  Users, 
  TrendingUp, 
  Activity,
  DollarSign,
  Briefcase,
  Clock,
  UserCheck,
  AlertTriangle,
  Shield,
  Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export const UserAnalyticsDashboard = () => {
  const { users, loading } = useRealTimeUsers();
  const { stats } = useAdminStats();

  // Calculate user analytics
  const usersByRole = users.reduce((acc, user) => {
    const role = user.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const usersByStatus = users.reduce((acc, user) => {
    acc[user.status] = (acc[user.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const usersByKycStatus = users.reduce((acc, user) => {
    acc[user.kyc_status] = (acc[user.kyc_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top performers (users with most jobs/earnings)
  const topPerformers = users
    .filter(user => user.role === 'provider')
    .sort((a, b) => b.total_earnings - a.total_earnings)
    .slice(0, 10);

  const topClients = users
    .filter(user => user.role === 'client')
    .sort((a, b) => b.total_jobs - a.total_jobs)
    .slice(0, 10);

  // High-risk users (multiple criteria)
  const highRiskUsers = users.filter(user => {
    const hasHighActivity = user.total_jobs > 20; // Very active
    const hasHighEarnings = user.total_earnings > 10000; // High earnings
    const recentSignup = new Date(user.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Recent signup
    const noKyc = user.kyc_status !== 'complete';
    
    return (hasHighActivity || hasHighEarnings) && (recentSignup || noKyc);
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const roleData = Object.entries(usersByRole).map(([role, count]) => ({
    name: role === 'client' ? 'Clientes' : role === 'provider' ? 'Prestadores' : role === 'admin' ? 'Admins' : role,
    value: count
  }));

  const kycData = Object.entries(usersByKycStatus).map(([status, count]) => ({
    name: status === 'complete' ? 'Completo' : status === 'pending' ? 'Pendente' : status === 'incomplete' ? 'Incompleto' : status,
    value: count
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Analytics Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newUsersThisMonth || 0} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {((users.filter(u => u.status === 'active').length / users.length) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários de Alto Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRiskUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Requer monitoramento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue por Usuário</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.length > 0 ? formatCurrency(users.reduce((sum, u) => sum + u.total_earnings, 0) / users.length) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Média por usuário
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performers">Top Performers</TabsTrigger>
          <TabsTrigger value="risk">Alto Risco ({highRiskUsers.length})</TabsTrigger>
          <TabsTrigger value="behavior">Análise Comportamental</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>Clientes vs Prestadores vs Admins</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status KYC</CardTitle>
                <CardDescription>Distribuição do status de verificação</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={kycData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performers" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top Prestadores
                </CardTitle>
                <CardDescription>Prestadores com maior receita</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.slice(0, 5).map((user, idx) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.total_jobs} jobs • {formatCurrency(user.total_earnings)}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        ⭐ N/A
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  Top Clientes
                </CardTitle>
                <CardDescription>Clientes mais ativos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topClients.slice(0, 5).map((user, idx) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.total_jobs} jobs criados
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        Cliente VIP
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Usuários de Alto Risco
              </CardTitle>
              <CardDescription>
                Usuários que requerem monitoramento especial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {highRiskUsers.map((user) => {
                  const reasons = [];
                  if (user.total_jobs > 20) reasons.push('Alta atividade');
                  if (user.total_earnings > 10000) reasons.push('Alto volume financeiro');
                  if (new Date(user.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) reasons.push('Conta recente');
                  if (user.kyc_status !== 'complete') reasons.push('KYC incompleto');

                  return (
                    <div key={user.id} className="flex items-center gap-4 p-3 border border-red-200 rounded-lg bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{user.full_name || 'Nome não informado'}</h3>
                          <Badge variant="destructive">
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user.total_jobs} jobs • {formatCurrency(user.total_earnings)} • KYC: {user.kyc_status}
                        </p>
                        <p className="text-xs text-red-600">
                          Fatores de risco: {reasons.join(', ')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Investigar
                        </Button>
                        <Button variant="destructive" size="sm">
                          Monitorar
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {highRiskUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-500" />
                    <p>Nenhum usuário de alto risco identificado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Padrões de Atividade</CardTitle>
                <CardDescription>Análise comportamental dos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Usuários Hiperativos</h4>
                      <p className="text-sm text-muted-foreground">Mais de 10 jobs por mês</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {users.filter(u => u.total_jobs > 10).length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Usuários Consistentes</h4>
                      <p className="text-sm text-muted-foreground">Atividade regular e confiável</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {users.filter(u => u.is_verified && u.total_jobs > 0 && u.total_jobs < 10).length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Usuários Inativos</h4>
                      <p className="text-sm text-muted-foreground">Registrados mas sem atividade</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {users.filter(u => u.total_jobs === 0).length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Usuários Suspeitos</h4>
                      <p className="text-sm text-muted-foreground">Comportamento anômalo</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {highRiskUsers.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights de Engajamento</CardTitle>
                <CardDescription>Métricas de atividade e retenção</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Taxa de Conversão KYC</span>
                    <Badge className="bg-green-100 text-green-800">
                      {((users.filter(u => u.kyc_status === 'complete').length / users.length) * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Usuários Verificados</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {users.filter(u => u.is_verified).length}/{users.length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prestadores Ativos</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {users.filter(u => u.role === 'provider' && u.total_jobs > 0).length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Clientes com Jobs</span>
                    <Badge className="bg-orange-100 text-orange-800">
                      {users.filter(u => u.role === 'client' && u.total_jobs > 0).length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Revenue Média Prestador</span>
                    <Badge className="bg-green-100 text-green-800">
                      {(() => {
                        const providers = users.filter(u => u.role === 'provider' && u.total_earnings > 0);
                        return providers.length > 0 
                          ? formatCurrency(providers.reduce((sum, u) => sum + u.total_earnings, 0) / providers.length)
                          : 'R$ 0,00';
                      })()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};