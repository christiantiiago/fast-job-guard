import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
  job_id: string;
  jobs: {
    title: string;
  };
}

interface WalletStats {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalSpent: number;
}

export default function Wallet() {
  const { user, userRole } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<WalletStats>({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch escrow payments - buscar dados separadamente para evitar problemas de join
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_payments')
        .select('*')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (escrowError) {
        console.error('Error fetching escrow payments:', escrowError);
        return;
      }

      // Buscar títulos dos jobs separadamente e filtrar jobs cancelados/removidos
      const jobIds = escrowData?.map(p => p.job_id).filter(Boolean) || [];
      let jobTitles: Record<string, string> = {};
      let validJobIds: string[] = [];
      
      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, title, status')
          .in('id', jobIds)
          .not('status', 'in', '(cancelled,removed)');
        
        validJobIds = (jobsData || []).map(job => job.id);
        jobTitles = (jobsData || []).reduce((acc, job) => {
          acc[job.id] = job.title;
          return acc;
        }, {} as Record<string, string>);
      }

      // Filtrar apenas pagamentos de jobs válidos
      const filteredEscrowData = escrowData?.filter(payment => 
        validJobIds.includes(payment.job_id)
      ) || [];

      // Transform escrow payments to match Payment interface
      const transformedPayments: Payment[] = filteredEscrowData.map(payment => ({
        id: payment.id,
        amount: payment.amount, // Usar amount ao invés de total_amount
        platform_fee: payment.platform_fee,
        status: payment.status === 'released' ? 'captured' : payment.status,
        created_at: payment.created_at,
        job_id: payment.job_id,
        jobs: {
          title: jobTitles[payment.job_id] || 'Trabalho removido'
        }
      }));

      setPayments(transformedPayments);
      
      // Calculate stats
      const newStats = {
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalSpent: 0
      };

      transformedPayments.forEach(payment => {
        if (userRole === 'client') {
          if (payment.status === 'captured') {
            newStats.totalSpent += payment.amount;
          } else if (payment.status === 'pending') {
            newStats.pendingBalance += payment.amount;
          }
        } else if (userRole === 'provider') {
          const netAmount = payment.amount - payment.platform_fee;
          if (payment.status === 'captured') {
            newStats.totalEarnings += netAmount;
            newStats.availableBalance += netAmount;
          } else if (payment.status === 'pending') {
            newStats.pendingBalance += netAmount;
          }
        }
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user, userRole]);

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { color: 'bg-warning/10 text-warning border-warning/20', label: 'Pendente', icon: Clock },
      'held': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Retido', icon: AlertCircle },
      'captured': { color: 'bg-success/10 text-success border-success/20', label: 'Concluído', icon: CheckCircle2 },
      'cancelled': { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Cancelado', icon: AlertCircle }
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <WalletIcon className="h-6 w-6" />
              Carteira
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'client' 
                ? 'Gerencie seus pagamentos e histórico de gastos'
                : 'Acompanhe seus ganhos e pagamentos recebidos'
              }
            </p>
          </div>
          <Button onClick={fetchWalletData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userRole === 'provider' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(stats.availableBalance)}</div>
                <p className="text-xs text-muted-foreground">Pronto para saque</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{formatCurrency(stats.pendingBalance)}</div>
              <p className="text-xs text-muted-foreground">Em processamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userRole === 'client' ? 'Total Gasto' : 'Total Ganho'}
              </CardTitle>
              {userRole === 'client' ? (
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(userRole === 'client' ? stats.totalSpent : stats.totalEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">Histórico total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transações</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
              <p className="text-xs text-muted-foreground">Total de pagamentos</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <WalletIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
                <p className="text-muted-foreground">
                  Suas transações aparecerão aqui quando você realizar pagamentos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.slice(0, 10).map((payment, index) => (
                  <div key={payment.id}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium">{payment.jobs.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(
                                userRole === 'client' 
                                  ? payment.amount 
                                  : payment.amount - payment.platform_fee
                              )}
                            </p>
                            {userRole === 'provider' && (
                              <p className="text-xs text-muted-foreground">
                                Taxa: {formatCurrency(payment.platform_fee)}
                              </p>
                            )}
                          </div>
                          <div>
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < payments.slice(0, 10).length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}