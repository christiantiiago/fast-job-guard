import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useState, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Calendar
} from 'lucide-react';

export default function AdminActivity() {
  const { logs, loading, error, refetch } = useAuditLogs(200);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

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
      case 'kyc_approved':
      case 'kyc_rejected':
        return <FileText className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
      case 'user_created':
      case 'login':
      case 'kyc_approved':
        return 'text-green-600';
      case 'update':
      case 'profile_updated':
        return 'text-blue-600';
      case 'delete':
      case 'kyc_rejected':
        return 'text-red-600';
      case 'facial_verification':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const logDate = new Date(log.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = logDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesAction && matchesEntity && matchesDate;
    });
  }, [logs, searchTerm, actionFilter, entityFilter, dateFilter]);

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueEntities = [...new Set(logs.map(log => log.entity_type))];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Histórico de Atividades
            </h1>
            <p className="text-muted-foreground">
              Monitore todas as ações realizadas na plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ação, usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas ações</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Entidade</label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas entidades</SelectItem>
                    {uniqueEntities.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todo período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Atividades ({filteredLogs.length})</span>
              <Badge variant="outline">{filteredLogs.length} resultados</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length > 0 ? (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {log.entity_type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        Usuário: <span className="font-medium">{log.user_name || 'Sistema'}</span>
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(log.created_at)}
                        </div>
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                        {log.entity_id && (
                          <span>ID: {log.entity_id.slice(0, 8)}...</span>
                        )}
                      </div>
                      
                       {/* Detalhes expandíveis com melhor formatação */}
                       {((log.metadata && Object.keys(log.metadata).length > 0) || log.old_values || log.new_values) && (
                         <details className="mt-2">
                           <summary className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
                             <FileText className="h-3 w-3" />
                             Ver detalhes da atividade
                           </summary>
                           <div className="mt-2 space-y-2">
                             {log.metadata && Object.keys(log.metadata).length > 0 && (
                               <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-200">
                                 <h5 className="text-xs font-semibold text-blue-800 mb-2">Metadados</h5>
                                 <div className="text-xs text-blue-700">
                                   {Object.entries(log.metadata).map(([key, value]) => (
                                     <div key={key} className="mb-1">
                                       <span className="font-medium">{key}:</span>{' '}
                                       <span className="text-blue-600">
                                         {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                       </span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                             
                             {log.old_values && (
                               <div className="p-3 bg-red-50 rounded border-l-4 border-red-200">
                                 <h5 className="text-xs font-semibold text-red-800 mb-2">Valores Anteriores</h5>
                                 <pre className="text-xs text-red-700 overflow-auto max-h-24">
                                   {JSON.stringify(log.old_values, null, 2)}
                                 </pre>
                               </div>
                             )}
                             
                             {log.new_values && (
                               <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
                                 <h5 className="text-xs font-semibold text-green-800 mb-2">Novos Valores</h5>
                                 <pre className="text-xs text-green-700 overflow-auto max-h-24">
                                   {JSON.stringify(log.new_values, null, 2)}
                                 </pre>
                               </div>
                             )}
                           </div>
                         </details>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                <p>Ajuste os filtros para ver mais resultados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}