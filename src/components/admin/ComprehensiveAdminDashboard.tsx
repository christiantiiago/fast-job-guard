import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
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

interface UserWithStats {
  id: string;
  user_id: string;
  full_name: string;
  kyc_status: string;
  created_at: string;
  role: string;
  documents_count: number;
  verified_documents_count: number;
}

export const ComprehensiveAdminDashboard = () => {
  const { stats, loading: statsLoading, refetch: refetchStats } = useAdminStats();
  const { logs, loading: logsLoading } = useAuditLogs(20);
  const { events } = useRealTimeActivity();
  const { toast } = useToast();

  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKYCData = async () => {
    try {
      setLoading(true);

      // Buscar documentos KYC pendentes
      const { data: documents, error: docsError } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          profiles (
            full_name,
            user_id
          )
        `)
        .eq('is_verified', false)
        .is('notes', null)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Buscar estatísticas de usuários com KYC
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Buscar contagem de documentos por usuário
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: userDocs } = await supabase
            .from('kyc_documents')
            .select('id, is_verified')
            .eq('user_id', user.user_id);

          return {
            ...user,
            role: (user as any).user_roles?.role || 'client',
            documents_count: userDocs?.length || 0,
            verified_documents_count: userDocs?.filter(doc => doc.is_verified).length || 0
          };
        })
      );

      setKycDocuments((documents || []).map(doc => ({
        id: doc.id,
        user_id: doc.user_id,
        document_type: doc.document_type,
        file_url: doc.file_url,
        file_name: doc.file_name,
        is_verified: doc.is_verified,
        notes: doc.notes,
        created_at: doc.created_at,
        profiles: doc.profiles ? {
          full_name: (doc.profiles as any).full_name || '',
          user_id: (doc.profiles as any).user_id || ''
        } : null
      })));
      setUsers(usersWithStats as any);
    } catch (error) {
      console.error('Erro ao buscar dados KYC:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do admin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          notes: 'Aprovado via dashboard admin'
        })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Documento aprovado",
        description: "O documento foi aprovado com sucesso.",
      });

      fetchKYCData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: false,
          verified_at: new Date().toISOString(),
          notes: 'Rejeitado via dashboard admin - documento não conforme'
        })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Documento rejeitado",
        description: "O documento foi rejeitado.",
      });

      fetchKYCData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchKYCData();
  }, []);

  const getDocumentIcon = (docType: string) => {
    const icons: Record<string, any> = {
      'rg': FileText,
      'cpf': FileText,
      'selfie': Camera,
      'address_proof': Home,
      'criminal_background': Receipt,
      'bank_info': Receipt
    };
    return icons[docType] || FileText;
  };

  const getDocumentLabel = (docType: string) => {
    const labels: Record<string, string> = {
      'rg': 'RG',
      'cpf': 'CPF',
      'selfie': 'Selfie',
      'address_proof': 'Comprovante de Residência',
      'criminal_background': 'Antecedentes Criminais',
      'bank_info': 'Dados Bancários'
    };
    return labels[docType] || docType;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  if (statsLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  const pendingKYC = users.filter(user => 
    user.kyc_status === 'incomplete' || user.kyc_status === 'pending' || user.kyc_status === 'em_analise'
  );

  const completedKYC = users.filter(user => user.kyc_status === 'approved');

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 md:h-8 w-8 text-primary" />
            Dashboard Administrativo
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários, KYC, jobs e atividades da plataforma
          </p>
        </div>
        <Button 
          onClick={() => {
            refetchStats();
            fetchKYCData();
          }}
          variant="outline"
          className="w-fit"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas Principais - Responsivos */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newUsersThisMonth || 0} este mês
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kycDocuments.length}</div>
            <p className="text-xs text-muted-foreground">
              Documentos aguardando
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
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

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.openDisputes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Abertas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="kyc" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="kyc">KYC ({kycDocuments.length})</TabsTrigger>
          <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
          <TabsTrigger value="activity">Atividades</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Tab KYC - Documentos Pendentes */}
        <TabsContent value="kyc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Documentos KYC Pendentes
              </CardTitle>
              <CardDescription>
                Documentos enviados pelos usuários aguardando verificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kycDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-500" />
                  <p>Nenhum documento pendente de análise</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {kycDocuments.slice(0, 10).map((doc) => {
                    const Icon = getDocumentIcon(doc.document_type);
                    return (
                      <div key={doc.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <Icon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                              <h3 className="font-medium">{getDocumentLabel(doc.document_type)}</h3>
                              <Badge variant="secondary" className="w-fit">
                                {doc.profiles?.full_name || 'Usuário'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Enviado em {formatDate(doc.created_at)} • {doc.file_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectDocument(doc.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveDocument(doc.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Usuários */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Usuários com KYC Pendente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  KYC Pendente ({pendingKYC.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingKYC.slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{user.full_name || 'Nome não informado'}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.role} • {user.documents_count}/{user.role === 'provider' ? '4' : '3'} docs
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {user.kyc_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usuários com KYC Aprovado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  KYC Aprovado ({completedKYC.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {completedKYC.slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{user.full_name || 'Nome não informado'}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.role} • Verificado
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">
                        Aprovado
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Atividades */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividades Recentes
              </CardTitle>
              <CardDescription>
                Últimas ações realizadas na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.slice(0, 20).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.entity_type} • {formatDate(log.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {log.entity_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Estatísticas */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visão Geral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total de Prestadores:</span>
                  <Badge variant="outline">{stats?.totalProviders || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total de Clientes:</span>
                  <Badge variant="outline">{stats?.totalClients || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Administradores:</span>
                  <Badge variant="outline">{stats?.totalAdmins || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Jobs Concluídos:</span>
                  <Badge variant="default">{stats?.completedJobs || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Receita Total:</span>
                  <Badge variant="default">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(stats?.totalRevenue || 0)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Em Escrow:</span>
                  <Badge variant="secondary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(stats?.escrowAmount || 0)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Valor Médio Job:</span>
                  <Badge variant="outline">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(stats?.averageJobValue || 0)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">KYC Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Pendentes:</span>
                  <Badge variant="secondary">{pendingKYC.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Aprovados:</span>
                  <Badge variant="default">{completedKYC.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Documentos Pendentes:</span>
                  <Badge variant="outline">{kycDocuments.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Taxa de Aprovação:</span>
                  <Badge variant="default">
                    {users.length > 0 ? Math.round((completedKYC.length / users.length) * 100) : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};