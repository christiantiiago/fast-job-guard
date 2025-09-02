import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Download,
  Upload,
  CreditCard,
  PiggyBank
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  job_id: string;
  jobs: {
    title: string;
  };
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
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
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<WalletStats>({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');

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

      // Fetch payments
      if (userRole === 'client') {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            jobs!inner(title)
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

        // Calculate client stats
        const totalSpent = paymentsData?.reduce((sum, payment) => {
          return payment.status === 'captured' ? sum + payment.amount : sum;
        }, 0) || 0;

        setStats(prev => ({
          ...prev,
          totalSpent
        }));
      }

      // Fetch provider data
      if (userRole === 'provider') {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            jobs!inner(title)
          `)
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

        const { data: payoutsData, error: payoutsError } = await supabase
          .from('payouts')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (payoutsError) throw payoutsError;
        setPayouts(payoutsData || []);

        // Calculate provider stats
        const totalEarnings = paymentsData?.reduce((sum, payment) => {
          return payment.status === 'captured' ? sum + payment.net_amount : sum;
        }, 0) || 0;

        const pendingBalance = paymentsData?.reduce((sum, payment) => {
          return payment.status === 'held' ? sum + payment.net_amount : sum;
        }, 0) || 0;

        const withdrawnAmount = payoutsData?.reduce((sum, payout) => {
          return payout.status === 'paid' ? sum + payout.amount : sum;
        }, 0) || 0;

        setStats({
          availableBalance: totalEarnings - withdrawnAmount - pendingBalance,
          pendingBalance,
          totalEarnings,
          totalSpent: 0
        });
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Insira um valor válido');
      return;
    }

    if (amount > stats.availableBalance) {
      toast.error('Saldo insuficiente');
      return;
    }

    try {
      const { error } = await supabase
        .from('payouts')
        .insert({
          provider_id: user?.id,
          amount: amount,
          status: 'pending',
          provider: 'stripe'
        });

      if (error) throw error;

      toast.success('Solicitação de saque enviada!', {
        description: 'Processaremos seu saque em até 2 dias úteis.'
      });
      
      setWithdrawAmount('');
      fetchWalletData();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Erro ao solicitar saque');
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user, userRole]);

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente', icon: Clock },
      'held': { color: 'bg-orange-100 text-orange-800', label: 'Retido', icon: AlertCircle },
      'captured': { color: 'bg-green-100 text-green-800', label: 'Concluído', icon: CheckCircle2 },
      'paid': { color: 'bg-green-100 text-green-800', label: 'Pago', icon: CheckCircle2 },
      'failed': { color: 'bg-red-100 text-red-800', label: 'Falhou', icon: AlertCircle }
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.color}>
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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <WalletIcon className="h-6 w-6" />
            Carteira
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'client' 
              ? 'Gerencie seus pagamentos e histórico de gastos'
              : 'Acompanhe seus ganhos, saques e pagamentos recebidos'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userRole === 'provider' ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.availableBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Disponível para saque
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Pendente</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(stats.pendingBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Em processamento
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalEarnings)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ganhos totais
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saques</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {payouts.filter(p => p.status === 'paid').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saques realizados
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats.totalSpent)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total investido
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {payments.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total de transações
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {payments.filter(p => p.status === 'captured').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pagamentos finalizados
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {payments.filter(p => p.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Em processamento
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Provider Withdrawal Section */}
        {userRole === 'provider' && stats.availableBalance > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Solicitar Saque
              </CardTitle>
              <CardDescription>
                Retire seus ganhos para sua conta bancária
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="withdraw-amount">Valor do Saque (R$)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="0,00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={stats.availableBalance}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo: {formatCurrency(stats.availableBalance)}
                  </p>
                </div>
                <Button 
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="self-end"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Sacar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payments">
              {userRole === 'client' ? 'Pagamentos Realizados' : 'Pagamentos Recebidos'}
            </TabsTrigger>
            {userRole === 'provider' && (
              <TabsTrigger value="payouts">Saques</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma transação</h3>
                  <p className="text-muted-foreground">
                    {userRole === 'client' 
                      ? 'Você ainda não realizou nenhum pagamento'
                      : 'Você ainda não recebeu nenhum pagamento'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="font-medium">{payment.jobs.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{new Date(payment.created_at).toLocaleDateString('pt-BR')}</span>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(userRole === 'client' ? payment.amount : payment.net_amount)}
                        </p>
                        {userRole === 'provider' && (
                          <p className="text-xs text-muted-foreground">
                            Taxa: {formatCurrency(payment.platform_fee)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {userRole === 'provider' && (
            <TabsContent value="payouts" className="space-y-4">
              {payouts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Download className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum saque realizado</h3>
                    <p className="text-muted-foreground">
                      Você ainda não solicitou nenhum saque
                    </p>
                  </CardContent>
                </Card>
              ) : (
                payouts.map((payout) => (
                  <Card key={payout.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="font-medium">Saque</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              Solicitado em {new Date(payout.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            {getStatusBadge(payout.status)}
                          </div>
                          {payout.processed_at && (
                            <p className="text-xs text-muted-foreground">
                              Processado em {new Date(payout.processed_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payout.amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}