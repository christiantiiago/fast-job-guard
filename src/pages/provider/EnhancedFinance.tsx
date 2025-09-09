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
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Target,
  Download,
  Eye,
  EyeOff,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Banknote,
  Smartphone,
  QrCode,
  Crown,
  Plus,
  Edit2
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  category: string;
}

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
  
  const { calculateFees, getFeeDescription, isPremiumUser } = useFeeRules();

  // Mock data
  const balance = 15750.80;
  const availableForWithdrawal = 12340.50;
  const pendingPayments = 3410.30;
  
  // Calcular taxa real baseada no sistema
  const sampleAmount = 1000;
  const feeCalculation = calculateFees(sampleAmount);
  const currentFeeRate = feeCalculation.feePercentage;

  const earningsData = [
    { month: 'Jan', earnings: 8500, jobs: 12 },
    { month: 'Fev', earnings: 12300, jobs: 18 },
    { month: 'Mar', earnings: 15200, jobs: 22 },
    { month: 'Abr', earnings: 18900, jobs: 28 },
    { month: 'Mai', earnings: 15750, jobs: 24 },
    { month: 'Jun', earnings: 19500, jobs: 30 }
  ];

  const categoryData = [
    { name: 'Instalação Elétrica', value: 45, amount: 7087.50 },
    { name: 'Manutenção', value: 30, amount: 4725.00 },
    { name: 'Reforma', value: 20, amount: 3150.00 },
    { name: 'Outros', value: 5, amount: 787.50 }
  ];

  const recentTransactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      amount: 1200.00,
      description: 'Serviço de instalação elétrica',
      date: '2024-01-15',
      status: 'completed',
      category: 'Instalação'
    },
    {
      id: '2',
      type: 'withdrawal',
      amount: 800.00,
      description: 'Saque PIX',
      date: '2024-01-14',
      status: 'completed',
      category: 'Saque'
    },
    {
      id: '3',
      type: 'income',
      amount: 2500.00,
      description: 'Reforma completa - Etapa 1',
      date: '2024-01-13',
      status: 'pending',
      category: 'Reforma'
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const addGoal = () => {
    if (newGoal.name && newGoal.target > 0) {
      const goal: Goal = {
        id: Date.now().toString(),
        ...newGoal,
        current: 0,
        color: COLORS[goals.length % COLORS.length]
      };
      setGoals([...goals, goal]);
      setNewGoal({ name: '', target: 0, period: 'monthly' });
      setShowGoalDialog(false);
    }
  };

  const updateGoalProgress = (goalId: string, amount: number) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, current: Math.min(goal.current + amount, goal.target) }
        : goal
    ));
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'income') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (type === 'withdrawal') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>,
      failed: <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Falhou</Badge>
    };
    return variants[status as keyof typeof variants];
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header with Balance and Premium Status */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
          <div className="relative p-8 text-primary-foreground">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  Carteira Digital
                </h1>
                <p className="text-primary-foreground/80">
                  {getFeeDescription()}
                </p>
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
                <p className="text-primary-foreground/80 text-sm">Saldo Total</p>
                <p className="text-4xl font-bold">
                  {showBalance ? formatCurrency(balance) : '••••••'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>+15.3% este mês</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm">Disponível para Saque</p>
                <p className="text-2xl font-semibold">
                  {showBalance ? formatCurrency(availableForWithdrawal) : '••••••'}
                </p>
                <Button size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Banknote className="h-4 w-4 mr-2" />
                  Sacar
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm">Sua Taxa Atual</p>
                <p className="text-2xl font-semibold">
                  {currentFeeRate.toFixed(1)}%
                </p>
                <div className="text-sm">
                  <span className="text-primary-foreground/80">
                    {isPremiumUser ? 'Taxa Premium Ativa' : 'Saques instantâneos via PIX'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
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


        {/* Goals Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Minhas Metas
                </CardTitle>
                <CardDescription>
                  Acompanhe o progresso das suas metas financeiras
                </CardDescription>
              </div>
              <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Meta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Meta</DialogTitle>
                    <DialogDescription>
                      Defina uma meta financeira para acompanhar seu progresso
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="goal-name">Nome da Meta</Label>
                      <Input
                        id="goal-name"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                        placeholder="Ex: Meta de Janeiro"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal-target">Valor Alvo</Label>
                      <Input
                        id="goal-target"
                        type="number"
                        value={newGoal.target}
                        onChange={(e) => setNewGoal({...newGoal, target: Number(e.target.value)})}
                        placeholder="Ex: 20000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal-period">Período</Label>
                      <select 
                        id="goal-period"
                        className="w-full p-2 border rounded-md"
                        value={newGoal.period}
                        onChange={(e) => setNewGoal({...newGoal, period: e.target.value as 'weekly' | 'monthly' | 'yearly'})}
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                        <option value="yearly">Anual</option>
                      </select>
                    </div>
                    <Button onClick={addGoal} className="w-full">
                      Criar Meta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {goals.map((goal) => {
                const progress = (goal.current / goal.target) * 100;
                return (
                  <div key={goal.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{goal.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(goal.current)} de {formatCurrency(goal.target)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {progress.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateGoalProgress(goal.id, 100)}
                      >
                        +R$ 100
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateGoalProgress(goal.id, 500)}
                      >
                        +R$ 500
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateGoalProgress(goal.id, 1000)}
                      >
                        +R$ 1000
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Performance Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganhos este Mês</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(15750)}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+23%</span> vs mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trabalhos Concluídos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+12%</span> vs mês anterior
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
                  <div className="text-2xl font-bold">4.8</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+0.2</span> vs mês anterior
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução dos Ganhos</CardTitle>
                <CardDescription>
                  Acompanhe o crescimento dos seus ganhos nos últimos 6 meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={earningsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Ganhos']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="earnings" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Ganhos por Categoria</CardTitle>
                  <CardDescription>
                    Distribuição dos seus ganhos por tipo de serviço
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }: any) => `${name} ${(percent! * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Percentual']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    {categoryData.map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(category.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fee Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparação de Taxas</CardTitle>
                  <CardDescription>
                    Economia potencial com o plano Premium
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">Taxa Padrão</span>
                      <span className="text-lg font-bold">4,9%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-lg">
                      <span className="font-medium flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        Taxa Premium
                      </span>
                      <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">3,5%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Sistema de taxas atualizado:
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      Prestadores Premium têm prioridade nas buscas!
                    </p>
                  </div>

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
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')} • {transaction.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Financeiros</CardTitle>
                <CardDescription>
                  Exporte relatórios detalhados dos seus ganhos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="h-16">
                    <Download className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <p className="font-medium">Relatório Mensal</p>
                      <p className="text-xs text-muted-foreground">PDF com todos os ganhos</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-16">
                    <Download className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <p className="font-medium">Comprovante de Renda</p>
                      <p className="text-xs text-muted-foreground">Para fins bancários</p>
                    </div>
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