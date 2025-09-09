import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PiggyBank,
  Target,
  Calendar,
  Download,
  Upload,
  Eye,
  EyeOff,
  Settings,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  Banknote,
  Smartphone,
  QrCode
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

interface EarningsData {
  month: string;
  earnings: number;
  jobs: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function FinanceRevolutionary() {
  const [showBalance, setShowBalance] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock data - in real app, this would come from API
  const balance = 15750.80;
  const availableForWithdrawal = 12340.50;
  const pendingPayments = 3410.30;
  const monthlyGoal = 20000;
  const goalProgress = (balance / monthlyGoal) * 100;

  const earningsData: EarningsData[] = [
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

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'income') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (type === 'withdrawal') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>,
      failed: <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Falhou</Badge>
    };
    return variants[status as keyof typeof variants];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header with Balance */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 primary-gradient opacity-90" />
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Carteira Digital</h1>
                <p className="text-white/80">Gerencie seus ganhos e pagamentos</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white hover:bg-white/20"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-white/80 text-sm">Saldo Total</p>
                <p className="text-4xl font-bold">
                  {showBalance ? formatCurrency(balance) : '••••••'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>+15.3% este mês</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-white/80 text-sm">Disponível para Saque</p>
                <p className="text-2xl font-semibold">
                  {showBalance ? formatCurrency(availableForWithdrawal) : '••••••'}
                </p>
                <Button size="sm" className="bg-white text-primary hover:bg-white/90">
                  <Banknote className="h-4 w-4 mr-2" />
                  Sacar
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-white/80 text-sm">Pagamentos Pendentes</p>
                <p className="text-2xl font-semibold">
                  {showBalance ? formatCurrency(pendingPayments) : '••••••'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>3 pagamentos aguardando</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4 mt-8">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <QrCode className="h-5 w-5 mr-2" />
                PIX
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Smartphone className="h-5 w-5 mr-2" />
                Cartão Virtual
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Download className="h-5 w-5 mr-2" />
                Extrato
              </Button>
            </div>
          </div>
        </div>

        {/* Goal Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Meta Mensal
                </CardTitle>
                <CardDescription>
                  Faltam {formatCurrency(monthlyGoal - balance)} para atingir sua meta
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {goalProgress.toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={goalProgress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>R$ 0</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(balance)} de {formatCurrency(monthlyGoal)}
                </span>
                <span>{formatCurrency(monthlyGoal)}</span>
              </div>
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
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(656.25)}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+8%</span> vs mês anterior
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Performance</CardTitle>
                  <CardDescription>
                    Indicadores chave do seu desempenho
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Conversão</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tempo Médio de Resposta</span>
                      <span className="font-medium">2.5h</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Satisfação</span>
                      <span className="font-medium">96%</span>
                    </div>
                    <Progress value={96} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Recomendações</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
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
                        {getTransactionIcon(transaction.type, transaction.status)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')} • {transaction.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={`font-medium ${
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
                  Gere relatórios detalhados para controle financeiro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Download className="h-6 w-6" />
                    <span>Extrato Mensal</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Calendar className="h-6 w-6" />
                    <span>Relatório Anual</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <PiggyBank className="h-6 w-6" />
                    <span>Análise de Categorias</span>
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