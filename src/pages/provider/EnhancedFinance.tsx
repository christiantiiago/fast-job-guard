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
  Plus
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
        const paymentDate = new Date(payment.processed_at || payment.created_at);
        return paymentDate.getMonth() === monthDate.getMonth() && 
               paymentDate.getFullYear() === monthDate.getFullYear() &&
               payment.status === 'completed';
      });

      data.push({
        month: monthName,
        earnings: monthPayments.reduce((sum, p) => sum + p.net_amount, 0),
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
      <div className="p-6 space-y-8">
        {/* Header with Balance */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
          <div className="relative p-8 text-primary-foreground">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Carteira Digital</h1>
                <p className="text-primary-foreground/80">{getFeeDescription()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm">Total Ganho</p>
                <p className="text-4xl font-bold">
                  {showBalance ? formatCurrency(stats.totalEarnings) : '••••••'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>Este mês: {formatCurrency(stats.currentMonthEarnings)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm">Disponível para Saque</p>
                <p className="text-2xl font-semibold">
                  {showBalance ? formatCurrency(stats.availableBalance) : '••••••'}
                </p>
                <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                      <Banknote className="h-4 w-4 mr-2" />
                      Sacar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Solicitar Saque</DialogTitle>
                      <DialogDescription>
                        Disponível: {formatCurrency(stats.availableBalance)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="amount">Valor</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder="0,00"
                          max={stats.availableBalance}
                        />
                      </div>
                      <Button onClick={handleWithdrawal} className="w-full">
                        Confirmar Saque
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm">Pendente</p>
                <p className="text-2xl font-semibold">
                  {showBalance ? formatCurrency(stats.pendingAmount) : '••••••'}
                </p>
                <div className="text-sm">
                  <span className="text-primary-foreground/80">
                    Taxa atual: {currentFeeRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <QrCode className="h-5 w-5 mr-2" />
                PIX
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                <Smartphone className="h-5 w-5 mr-2" />
                Cartão Virtual
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                <Download className="h-5 w-5 mr-2" />
                Extrato
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganhos este Mês</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.currentMonthEarnings)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de {stats.totalJobs} trabalhos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trabalhos Concluídos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de trabalhos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa Paga</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentFeeRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {isPremiumUser ? (
                      <span className="text-green-600">Premium ativo</span>
                    ) : (
                      <span className="text-yellow-600">Taxa padrão</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgRating}</div>
                  <p className="text-xs text-muted-foreground">
                    Avaliação média
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>
                  Histórico completo de movimentações financeiras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...payments.slice(0, 5), ...payouts.slice(0, 3)].map((item) => {
                    const isPayment = 'net_amount' in item;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          {getTransactionIcon(item.status)}
                          <div>
                            <p className="font-medium">
                              {isPayment 
                                ? `Pagamento - ${(item as any).job_title}`
                                : 'Saque solicitado'
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')} • 
                              {isPayment ? 'Recebimento' : 'Saque'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                            {isPayment ? '+' : '-'}{formatCurrency(item.amount)}
                          </p>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Financeiros</CardTitle>
                <CardDescription>
                  Exporte seus dados financeiros para análise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Relatório Mensal - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Relatório Anual - {new Date().getFullYear()}
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Declaração de Rendimentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}