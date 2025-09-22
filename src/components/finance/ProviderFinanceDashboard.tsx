import { useState } from 'react';
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
  Wallet,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Banknote,
  Eye,
  EyeOff,
  Shield,
  TrendingDown,
  CreditCard,
  Calendar,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export function ProviderFinanceDashboard() {
  const { user } = useAuth();
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
      'held': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Em Garantia', icon: Shield },
      'completed': { color: 'bg-success/10 text-success border-success/20', label: 'Concluído', icon: CheckCircle2 },
      'released': { color: 'bg-success/10 text-success border-success/20', label: 'Liberado', icon: CheckCircle2 },
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
      <div className="space-y-6">
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            Painel Financeiro
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus ganhos, saques e histórico de pagamentos de forma segura e profissional
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBalance(!showBalance)}
            className="gap-2"
          >
            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalance ? 'Ocultar' : 'Mostrar'}
          </Button>
          <Button onClick={refetch} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Saldo Disponível */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-success/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-success mb-2">
              {showBalance ? formatCurrency(stats.availableBalance) : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground mb-3">Pronto para saque</p>
            {stats.availableBalance > 0 && (
              <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full gap-2">
                    <Banknote className="h-4 w-4" />
                    Solicitar Saque
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Solicitar Saque
                    </DialogTitle>
                    <DialogDescription>
                      Disponível: <span className="font-semibold text-success">{formatCurrency(stats.availableBalance)}</span>
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
                    <Button onClick={handleWithdrawal} className="w-full gap-2">
                      <Banknote className="h-4 w-4" />
                      Confirmar Saque
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Saldo em Garantia */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-warning/5 to-warning/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Saldo em Garantia</CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Shield className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-warning">
              {showBalance ? formatCurrency(stats.pendingAmount) : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando liberação</p>
          </CardContent>
        </Card>

        {/* Total Ganho */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Ganho</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              {showBalance ? formatCurrency(stats.totalEarnings) : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">Histórico total</p>
          </CardContent>
        </Card>

        {/* Trabalhos Concluídos */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-blue-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Trabalhos</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Mensais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {showBalance ? formatCurrency(stats.currentMonthEarnings) : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">Ganhos do mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Sacado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {showBalance ? formatCurrency(stats.totalWithdrawn) : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">Histórico de saques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Total de transações</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                <Wallet className="h-16 w-16 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground">
                Suas transações aparecerão aqui quando você receber pagamentos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.slice(0, 10).map((payment, index) => (
                <div key={payment.id}>
                  <div className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{payment.job_title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{payment.client_name}</span>
                            <span>•</span>
                            <span>{new Date(payment.created_at).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span>{payment.payment_method}</span>
                          </div>
                          {payment.release_date && (
                            <p className="text-xs text-muted-foreground">
                              Liberação: {new Date(payment.release_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {showBalance ? formatCurrency(payment.net_amount || payment.amount) : '••••••'}
                          </p>
                          {payment.net_amount && payment.amount !== payment.net_amount && (
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
  );
}