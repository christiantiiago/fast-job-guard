import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Banknote,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export default function Wallet() {
  const { user, userRole } = useAuth();
  const { payments, stats, loading, requestWithdrawal, refetch } = useFinanceData();
  const [showBalance, setShowBalance] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > stats.availableBalance) {
      toast.error('Valor inválido. Verifique o valor e tente novamente.');
      return;
    }

    try {
      await requestWithdrawal(amount, { type: 'pix', key: 'user@email.com' });
      toast.success('Saque solicitado com sucesso! Será processado em até 2 dias úteis.');
      setShowWithdrawalDialog(false);
      setWithdrawalAmount('');
    } catch (error) {
      toast.error('Erro ao solicitar saque. Tente novamente mais tarde.');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { color: 'bg-warning/10 text-warning border-warning/20', label: 'Pendente', icon: Clock },
      'held': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Retido', icon: AlertCircle },
      'completed': { color: 'bg-success/10 text-success border-success/20', label: 'Concluído', icon: CheckCircle2 },
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
              Carteira Digital
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'client' 
                ? 'Gerencie seus pagamentos e histórico de gastos'
                : 'Acompanhe seus ganhos e pagamentos recebidos'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
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
                <div className="text-2xl font-bold text-success">
                  {showBalance ? formatCurrency(stats.availableBalance) : '••••••'}
                </div>
                <p className="text-xs text-muted-foreground">Pronto para saque</p>
                {stats.availableBalance > 0 && (
                  <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="mt-2 w-full">
                        <Banknote className="h-4 w-4 mr-2" />
                        Sacar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Solicitar Saque</DialogTitle>
                        <DialogDescription>
                          Disponível: {formatCurrency(stats.availableBalance)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount">Valor do Saque</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={withdrawalAmount}
                            onChange={(e) => setWithdrawalAmount(e.target.value)}
                            placeholder="0,00"
                            max={stats.availableBalance}
                            className="mt-2"
                          />
                        </div>
                        <Button onClick={handleWithdrawal} className="w-full">
                          <Banknote className="h-4 w-4 mr-2" />
                          Confirmar Saque
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {showBalance ? formatCurrency(stats.pendingAmount) : '••••••'}
              </div>
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
                {showBalance ? formatCurrency(userRole === 'client' ? stats.totalExpenses : stats.totalEarnings) : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground">Histórico total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trabalhos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                {userRole === 'client' ? 'Contratados' : 'Concluídos'}
              </p>
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
                            <p className="font-medium">{payment.job_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.client_name} • {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.payment_method}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {showBalance ? formatCurrency(payment.net_amount || payment.amount) : '••••••'}
                            </p>
                            {userRole === 'provider' && payment.net_amount && (
                              <p className="text-xs text-muted-foreground">
                                Bruto: {showBalance ? formatCurrency(payment.amount) : '••••••'}
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