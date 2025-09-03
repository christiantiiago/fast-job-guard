import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Shield,
  Eye,
  UserPlus,
  Briefcase,
  CreditCard,
  FileText,
  MessageCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const ActivityDashboard = () => {
  const { events, stats, loading } = useRealTimeActivity(100);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
      case 'logout':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'job_created':
      case 'job_updated':
        return <Briefcase className="h-4 w-4 text-green-500" />;
      case 'proposal_sent':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'payment_processed':
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      case 'kyc_uploaded':
        return <UserPlus className="h-4 w-4 text-indigo-500" />;
      case 'dispute_created':
        return <MessageCircle className="h-4 w-4 text-red-500" />;
      case 'profile_updated':
        return <Users className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string, isSuspicious: boolean) => {
    if (isSuspicious) return 'destructive';
    
    switch (eventType) {
      case 'login':
        return 'default';
      case 'job_created':
        return 'secondary';
      case 'payment_processed':
        return 'outline';
      case 'dispute_created':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getEventDescription = (event: any) => {
    const descriptions: Record<string, string> = {
      'login': 'Usuário fez login',
      'logout': 'Usuário fez logout',
      'job_created': 'Novo job criado',
      'job_updated': 'Job atualizado',
      'proposal_sent': 'Proposta enviada',
      'payment_processed': 'Pagamento processado',
      'kyc_uploaded': 'Documento KYC enviado',
      'dispute_created': 'Disputa criada',
      'profile_updated': 'Perfil atualizado'
    };

    return descriptions[event.event_type] || event.event_type;
  };

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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventsToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEvents} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Suspeitos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspiciousEvents}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade por Hora</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...stats.hourlyActivity.map(h => h.count))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pico de atividade
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Eventos Recentes</TabsTrigger>
          <TabsTrigger value="patterns">Padrões de Atividade</TabsTrigger>
          <TabsTrigger value="suspicious">Atividades Suspeitas</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos em Tempo Real</CardTitle>
              <CardDescription>
                Últimas atividades da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getEventIcon(event.event_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {getEventDescription(event)}
                        </p>
                        <Badge variant={getEventColor(event.event_type, event.is_suspicious || false)}>
                          {event.event_type}
                        </Badge>
                        {event.is_suspicious && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Suspeito
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{event.user_name || 'Unknown User'}</span>
                        <span>•</span>
                        <span>{event.user_role}</span>
                        <span>•</span>
                        <span>{formatDate(event.created_at)}</span>
                        {event.ip_address && (
                          <>
                            <span>•</span>
                            <span>{event.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                ))}

                {events.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atividade por Hora (24h)</CardTitle>
                <CardDescription>Distribuição de eventos por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(hour) => `${hour}:00`}
                      formatter={(value) => [value, 'Eventos']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipos de Eventos</CardTitle>
                <CardDescription>Distribuição por tipo de atividade</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.topEvents}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="event_type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Atividades Suspeitas
              </CardTitle>
              <CardDescription>
                Eventos que requerem atenção especial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.filter(e => e.is_suspicious).slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 border border-red-200 rounded-lg bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {getEventDescription(event)}
                        </p>
                        <Badge variant="destructive">
                          Score: {event.risk_score || 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        {event.user_name} • {formatDate(event.created_at)}
                      </p>
                      {event.metadata?.suspiciousReasons && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Motivos: {event.metadata.suspiciousReasons.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Investigar
                      </Button>
                      <Button variant="destructive" size="sm">
                        Bloquear
                      </Button>
                    </div>
                  </div>
                ))}

                {events.filter(e => e.is_suspicious).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>Nenhuma atividade suspeita detectada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};