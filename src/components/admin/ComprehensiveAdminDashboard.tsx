import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { useKYCManagement } from '@/hooks/useKYCManagement';
import { MobileAdminStats } from './MobileAdminStats';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertTriangle,
  Shield,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Camera,
  Home,
  Receipt
} from 'lucide-react';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  is_verified: boolean;
  notes?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    user_id: string;
  } | null;
}

export function ComprehensiveAdminDashboard() {
  const { toast } = useToast();
  const { stats, loading: statsLoading } = useAdminStats();
  const { documents, loading: kycLoading, approveDocument, rejectDocument } = useKYCManagement();
  const { logs, loading: logsLoading } = useAuditLogs();
  const { events: activities, loading: activitiesLoading } = useRealTimeActivity();
  const [activeTab, setActiveTab] = useState('overview');

  const pendingDocuments = documents?.filter(doc => !doc.is_verified && !doc.notes) || [];
  const recentDocuments = documents?.slice(0, 5) || [];

  const handleApproveDocument = async (docId: string) => {
    try {
      await approveDocument(docId, 'Aprovado via dashboard admin');
      toast({
        title: "Documento aprovado",
        description: "O documento foi aprovado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectDocument = async (docId: string, reason: string) => {
    try {
      await rejectDocument(docId, reason);
      toast({
        title: "Documento rejeitado",
        description: "O documento foi rejeitado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie usuários, documentos KYC e monitore a plataforma
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Mobile-optimized Stats */}
      <MobileAdminStats stats={stats} loading={statsLoading} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm p-2 sm:p-3">
            <Home className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger value="kyc" className="text-xs sm:text-sm p-2 sm:p-3">
            <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            KYC
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm p-2 sm:p-3">
            <Activity className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Atividade</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm p-2 sm:p-3">
            <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Usuários</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Recent KYC Documents */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  Documentos KYC Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {kycLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : recentDocuments.length > 0 ? (
                  recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            Usuário #{doc.user_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.document_type} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={doc.is_verified ? 'default' : doc.notes ? 'destructive' : 'secondary'}>
                        {doc.is_verified ? 'Aprovado' : doc.notes ? 'Rejeitado' : 'Pendente'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum documento encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Alertas do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {pendingDocuments.length > 0 && (
                    <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">
                          {pendingDocuments.length} documento(s) KYC pendente(s)
                        </span>
                      </div>
                    </div>
                  )}
                  {activitiesLoading ? (
                    <div className="h-16 bg-muted rounded animate-pulse" />
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Shield className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Sistema operando normalmente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Documentos KYC Pendentes
              </CardTitle>
              <CardDescription className="text-sm">
                {pendingDocuments.length} documento(s) aguardando análise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {kycLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : pendingDocuments.length > 0 ? (
                pendingDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 sm:p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">
                            Usuário #{doc.user_id.slice(0, 8)}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {doc.document_type} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          {doc.file_name && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {doc.file_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0 ml-2">
                        Pendente
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (doc.file_url) {
                            window.open(doc.file_url, '_blank');
                          }
                        }}
                        variant="outline"
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <Eye className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveDocument(doc.id)}
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <CheckCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRejectDocument(doc.id, 'Documento rejeitado pelo administrador')}
                        variant="destructive"
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <XCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Todos os documentos foram processados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                Atividades Recentes
              </CardTitle>
              <CardDescription className="text-sm">
                Últimas ações realizadas na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {logsLoading || activitiesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : activities?.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.slice(0, 20).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.entity_type} • {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.entity_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma atividade recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  Estatísticas de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold">{stats?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-green-600">{stats?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Verificados</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-orange-600">{stats?.pendingKyc || 0}</div>
                    <p className="text-xs text-muted-foreground">KYC Pendente</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-blue-600">{stats?.newUsersThisMonth || 0}</div>
                    <p className="text-xs text-muted-foreground">Novos este mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                  Estatísticas da Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold">{stats?.totalJobs || 0}</div>
                    <p className="text-xs text-muted-foreground">Jobs Total</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-green-600">{stats?.completedJobs || 0}</div>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-blue-600">{stats?.activeJobs || 0}</div>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-lg sm:text-xl font-bold text-red-600">{stats?.openDisputes || 0}</div>
                    <p className="text-xs text-muted-foreground">Disputas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}