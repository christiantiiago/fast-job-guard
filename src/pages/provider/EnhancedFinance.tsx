import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet,
  TrendingUp,
  DollarSign,
  CreditCard,
  Target,
  Download,
  Eye,
  EyeOff,
  Settings,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Banknote,
  Smartphone,
  QrCode,
  Plus,
  Bell,
  Crown
} from 'lucide-react';

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  period: 'weekly' | 'monthly' | 'yearly';
  color: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function EnhancedFinance() {
  const [showBalance, setShowBalance] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      name: 'Meta Mensal',
      target: 20000,
      current: 15750.80,
      period: 'monthly',
      color: 'hsl(var(--primary))'
    }
  ]);
  const [newGoal, setNewGoal] = useState<{ name: string; target: number; period: 'weekly' | 'monthly' | 'yearly' }>({ name: '', target: 0, period: 'monthly' });
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  
  const { calculateFees, getFeeDescription, isPremiumUser } = useFeeRules();
  const { payments, payouts, stats, loading, requestWithdrawal } = useFinanceData();
  const { toast } = useToast();

  const sampleAmount = 1000;
  const feeCalculation = calculateFees(sampleAmount);
  const currentFeeRate = feeCalculation.feePercentage;

  const generateEarningsData = () => {
    const data = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short' });
      
      const monthPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate.getMonth() === monthDate.getMonth() && 
               paymentDate.getFullYear() === monthDate.getFullYear() &&
               (payment.status === 'completed' || payment.status === 'released');
      });

      data.push({
        month: monthName,
        earnings: monthPayments.reduce((sum, p) => sum + (p.net_amount || p.amount), 0),
        jobs: monthPayments.length
      });
    }

    return data;
  };

  const earningsData = generateEarningsData();

  const categoryData = [
    { name: 'Serviços Gerais', value: 60, amount: stats.totalEarnings * 0.6 },
    { name: 'Manutenção', value: 25, amount: stats.totalEarnings * 0.25 },
    { name: 'Instalação', value: 10, amount: stats.totalEarnings * 0.1 },
    { name: 'Outros', value: 5, amount: stats.totalEarnings * 0.05 }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > stats.availableBalance) {
      toast({
        title: "Valor inválido",
        description: "Verifique o valor e tente novamente.",
        variant: "destructive"
      });
      return;
    }

    try {
      await requestWithdrawal(amount, { type: 'pix', key: 'user@email.com' });
      toast({
        title: "Saque solicitado",
        description: "Seu saque será processado em até 2 dias úteis.",
      });
      setShowWithdrawalDialog(false);
      setWithdrawalAmount('');
    } catch (error) {
      toast({
        title: "Erro ao solicitar saque",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  const getTransactionIcon = (status: string) => {
    if (status === 'completed') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>,
      failed: <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Falhou</Badge>
    };
    return variants[status as keyof typeof variants];
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-8">
          <div className="text-center">Carregando dados financeiros...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-center px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header with Balance */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="absolute inset-0 primary-gradient" />
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative p-6 sm:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold">💰 Carteira Digital</h1>
                <p className="text-white/90 text-sm sm:text-base">{getFeeDescription()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-white/90 text-sm font-medium">Total Ganho</p>
                </div>
                <p className="text-3xl sm:text-4xl font-bold mb-2">
                  {showBalance ? formatCurrency(stats.totalEarnings) : '••••••'}
                </p>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <TrendingUp className="h-4 w-4" />
                  <span>Este mês: {formatCurrency(stats.currentMonthEarnings)}</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <p className="text-white/90 text-sm font-medium">Disponível</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-3">
                  {showBalance ? formatCurrency(stats.availableBalance) : '••••••'}
                </p>
                <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white text-primary hover:bg-white/90 rounded-full font-medium">
                      <Banknote className="h-4 w-4 mr-2" />
                      Sacar Agora
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>💳 Solicitar Saque</DialogTitle>
                      <DialogDescription>
                        Disponível: {formatCurrency(stats.availableBalance)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="amount" className="text-sm font-medium">Valor do Saque</Label>
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
                      <Button onClick={handleWithdrawal} className="w-full rounded-full">
                        <Banknote className="h-4 w-4 mr-2" />
                        Confirmar Saque
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Clock className="h-5 w-5" />
                  </div>
                  <p className="text-white/90 text-sm font-medium">Pendente</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-2">
                  {showBalance ? formatCurrency(stats.pendingAmount) : '••••••'}
                </p>
                <div className="text-sm text-white/80">
                  <span>Em escrow: {formatCurrency(stats.pendingAmount)}</span>
                  {isPremiumUser && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      <span className="text-yellow-300">Premium</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full font-medium">
                <QrCode className="h-5 w-5 mr-2" />
                PIX Rápido
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full">
                <Smartphone className="h-5 w-5 mr-2" />
                Cartão Virtual
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full">
                <Download className="h-5 w-5 mr-2" />
                Extrato PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 rounded-full p-1">
            <TabsTrigger value="overview" className="rounded-full font-medium">📊 Visão Geral</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-full font-medium">💳 Transações</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full font-medium">📄 Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Performance Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/10 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-medium">ESTE MÊS</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(stats.currentMonthEarnings)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.totalJobs} trabalhos concluídos
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-full">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-medium">TRABALHOS</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalJobs}</p>
                    <p className="text-sm text-muted-foreground">
                      Total concluídos
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-500/10 rounded-full">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-medium">EM ESCROW</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {formatCurrency(stats.pendingAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pagamentos retidos
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-full">
                      <Star className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-medium">AVALIAÇÃO</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {stats.avgRating || '4.8'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ⭐ Média geral
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">📈 Evolução dos Ganhos</CardTitle>
                    <CardDescription className="mt-2">
                      Acompanhe o crescimento dos seus ganhos nos últimos 6 meses
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={earningsData}>
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        className="text-sm"
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        className="text-sm"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Ganhos']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="earnings" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fill="url(#colorEarnings)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">💳 Transações Recentes</CardTitle>
                    <CardDescription className="mt-2">
                      Histórico completo de movimentações financeiras
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Lista
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {[...payments.slice(0, 5), ...payouts.slice(0, 3)].length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                    </div>
                  ) : (
                    [...payments.slice(0, 5), ...payouts.slice(0, 3)].map((item) => {
                      const isPayment = 'net_amount' in item;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors border border-muted">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${
                              item.status === 'completed' 
                                ? 'bg-green-100 dark:bg-green-900' 
                                : item.status === 'pending'
                                ? 'bg-yellow-100 dark:bg-yellow-900'
                                : 'bg-red-100 dark:bg-red-900'
                            }`}>
                              {getTransactionIcon(item.status)}
                            </div>
                            <div>
                              <p className="font-medium">
                                {isPayment 
                                  ? `💼 Pagamento - ${(item as any).job_title || 'Trabalho'}`
                                  : '💸 Saque solicitado'
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} • {isPayment ? 'Recebimento' : 'Saque'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                              {isPayment ? '+' : '-'}{formatCurrency(item.amount)}
                            </p>
                            <div className="mt-1">
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {[...payments.slice(0, 5), ...payouts.slice(0, 3)].length > 0 && (
                  <div className="text-center mt-6">
                    <Button variant="outline" className="rounded-full">
                      Ver Todas as Transações
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl">📊 Relatórios Financeiros</CardTitle>
                  <CardDescription>
                    Exporte seus dados financeiros para análise e declarações
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 hover:border-primary/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Download className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Relatório Mensal</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 hover:border-primary/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500/10 rounded-full">
                        <Download className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Relatório Anual</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date().getFullYear()}
                        </p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 hover:border-primary/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-500/10 rounded-full">
                        <Download className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Declaração de Rendimentos</p>
                        <p className="text-sm text-muted-foreground">
                          Para Imposto de Renda
                        </p>
                      </div>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl">⚙️ Configurações</CardTitle>
                  <CardDescription>
                    Personalize sua experiência financeira
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 hover:border-primary/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-500/10 rounded-full">
                        <Settings className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Dados Bancários</p>
                        <p className="text-sm text-muted-foreground">
                          Gerenciar conta para saques
                        </p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 hover:border-primary/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-amber-500/10 rounded-full">
                        <Bell className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Notificações</p>
                        <p className="text-sm text-muted-foreground">
                          Alertas de pagamento
                        </p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 hover:border-primary/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-500/10 rounded-full">
                        <Crown className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Upgrade Premium</p>
                        <p className="text-sm text-muted-foreground">
                          Reduza suas taxas
                        </p>
                      </div>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}