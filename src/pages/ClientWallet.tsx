import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EscrowCard } from '@/components/escrow/EscrowCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  Receipt,
  TrendingUp,
  Shield
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  client_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
  job: {
    id: string;
    title: string;
  };
  provider_profile: {
    full_name: string;
  };
}

interface EscrowPayment {
  id: string;
  amount: number;
  total_amount: number;
  platform_fee: number;
  status: string;
  release_date: string;
  created_at: string;
  completed_at?: string;
  job_id: string;
  client_id: string;
  provider_id: string;
  job?: {
    title: string;
  };
  provider_profile?: {
    full_name: string;
  };
}

export default function ClientWallet() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    pendingPayments: 0,
    completedPayments: 0,
    escrowHeld: 0,
    escrowReleased: 0
  });

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchEscrowPayments();
    }
  }, [user]);

  const fetchEscrowPayments = async () => {
    try {
      const { data: escrowData, error } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          amount,
          total_amount,
          platform_fee,
          status,
          release_date,
          created_at,
          completed_at,
          job_id,
          client_id,
          provider_id
        `)
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching escrow payments:', error);
        return;
      }

      if (escrowData) {
        // Get job titles and provider names
        const jobIds = escrowData.map(p => p.job_id).filter(Boolean);
        const providerIds = escrowData.map(p => p.provider_id).filter(Boolean);
        
        let jobTitles: Record<string, string> = {};
        let providerNames: Record<string, string> = {};
        
        if (jobIds.length > 0) {
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title')
            .in('id', jobIds);
          
          jobTitles = (jobsData || []).reduce((acc, job) => {
            acc[job.id] = job.title;
            return acc;
          }, {} as Record<string, string>);
        }
        
        if (providerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', providerIds);
          
          providerNames = (profilesData || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile.full_name || 'Prestador';
            return acc;
          }, {} as Record<string, string>);
        }
        
        const processedEscrowPayments = escrowData.map(payment => ({
          ...payment,
          job: {
            title: jobTitles[payment.job_id] || 'Trabalho removido'
          },
          provider_profile: {
            full_name: providerNames[payment.provider_id] || 'Prestador'
          }
        }));

        setEscrowPayments(processedEscrowPayments);
      }
    } catch (error) {
      console.error('Error fetching escrow payments:', error);
    }
  };
    try {
      setLoading(true);
      
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          platform_fee,
          client_fee,
          net_amount,
          status,
          created_at,
          processed_at,
          job_id,
          provider_id
        `)
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return;
      }

      if (paymentsData) {
        // Get job titles and provider names separately
        const jobIds = paymentsData?.map(p => p.job_id).filter(Boolean) || [];
        const providerIds = paymentsData?.map(p => p.provider_id).filter(Boolean) || [];
        
        let jobTitles: Record<string, string> = {};
        let providerNames: Record<string, string> = {};
        
        if (jobIds.length > 0) {
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title')
            .in('id', jobIds);
          
          jobTitles = (jobsData || []).reduce((acc, job) => {
            acc[job.id] = job.title;
            return acc;
          }, {} as Record<string, string>);
        }
        
        if (providerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', providerIds);
          
          providerNames = (profilesData || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile.full_name || 'Prestador';
            return acc;
          }, {} as Record<string, string>);
        }
        
        const processedPayments = paymentsData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          platform_fee: payment.platform_fee,
          client_fee: payment.client_fee,
          net_amount: payment.net_amount,
          status: payment.status,
          created_at: payment.created_at,
          processed_at: payment.processed_at,
          job: {
            id: payment.job_id || '',
            title: jobTitles[payment.job_id] || 'Trabalho removido'
          },
          provider_profile: {
            full_name: providerNames[payment.provider_id] || 'Prestador'
          }
        }));

        setPayments(processedPayments);
        calculateStats(processedPayments, escrowPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: Payment[], escrowData: EscrowPayment[] = []) => {
    const totalSpent = paymentsData
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalTransactions = paymentsData.length + escrowData.length;
    
    const pendingPayments = paymentsData
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const completedPayments = paymentsData
      .filter(p => p.status === 'completed').length;

    const escrowHeld = escrowData
      .filter(e => e.status === 'held')
      .reduce((sum, e) => sum + e.amount, 0);

    const escrowReleased = escrowData
      .filter(e => e.status === 'released')
      .reduce((sum, e) => sum + e.amount, 0);

    setStats({
      totalSpent: totalSpent + escrowReleased,
      totalTransactions,
      pendingPayments: pendingPayments + escrowHeld,
      completedPayments,
      escrowHeld,
      escrowReleased
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Falhou', color: 'bg-red-100 text-red-800' },
      held: { label: 'Retido', color: 'bg-blue-100 text-blue-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} border`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showKYCBanner={false}>
      <div className="container mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Minha Carteira</h1>
            <p className="text-muted-foreground">Gerencie seus pagamentos</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSpent)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transações</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingPayments)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedPayments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Escrow Payments Section */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Histórico de Pagamentos</TabsTrigger>
            <TabsTrigger value="escrow" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Pagamentos em Garantia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Histórico de Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum pagamento encontrado</h3>
                    <p className="text-muted-foreground">
                      Quando você contratar serviços, seus pagamentos aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="bg-muted p-2 rounded-lg">
                            {getStatusIcon(payment.status)}
                          </div>
                          <div>
                            <h4 className="font-medium">{payment.job.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Prestador: {payment.provider_profile.full_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(payment.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                            <span className="font-semibold text-red-600">
                              {formatCurrency(payment.amount)}
                            </span>
                            {getStatusBadge(payment.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Taxa: {formatCurrency(payment.client_fee)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escrow" className="space-y-4">
            {escrowPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum pagamento em garantia</h3>
                  <p className="text-muted-foreground">
                    Pagamentos com garantia aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {escrowPayments.map((escrow) => (
                  <div key={escrow.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>📋 {escrow.job?.title}</span>
                      <span>👤 {escrow.provider_profile?.full_name}</span>
                    </div>
                    <EscrowCard 
                      escrowPayment={escrow} 
                      isClient={true}
                      onUpdate={() => {
                        fetchEscrowPayments();
                        calculateStats(payments, escrowPayments);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}