import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useFeeRules } from '@/hooks/useFeeRules';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAdvancedWithdrawals } from '@/hooks/useAdvancedWithdrawals';
import { useFinanceReports } from '@/hooks/useFinanceReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  Activity,
  Download,
  Zap,
  Crown,
  BarChart3,
  PieChart,
  Settings,
  Star,
  Target,
  Award,
  FileText,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { PerformanceWidgets } from './PerformanceWidgets';
import { WithdrawalModal } from './WithdrawalModal';
import { SecuritySettings } from './SecuritySettings';

export function AdvancedProviderDashboard() {
  const { user } = useAuth();
  const { payments, payouts, stats, loading, refetch } = useFinanceData();
  const { isPremiumUser, feeRules } = useFeeRules();
  const { premiumStatus } = usePremiumStatus();
  const { autoWithdrawal, updateAutoWithdrawal } = useAdvancedWithdrawals();
  const { generateReport } = useFinanceReports();
  
  const [showBalance, setShowBalance] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleGenerateReport = async (type: 'monthly' | 'annual' | 'tax') => {
    try {
      toast.loading('Gerando relatório...');
      await generateReport(type, selectedPeriod);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
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
      </div>
    );
  }

  const currentFeeRate = isPremiumUser 
    ? feeRules?.provider_fee_premium || 5.0
    : feeRules?.provider_fee_standard || 7.5;

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPremiumUser ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10' : 'bg-primary/10'}`}>
              {isPremiumUser ? (
                <Crown className="h-8 w-8 text-amber-500" />
              ) : (
                <Wallet className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Painel Financeiro Profissional
              </h1>
              {isPremiumUser && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 mt-1">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium Ativo
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            Gestão completa de receitas • Taxa atual: {currentFeeRate}% • {stats.totalJobs} trabalhos concluídos
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Histórico</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="withdrawals">Saques</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
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
                <div className="text-2xl font-bold text-success mb-1">
                  {showBalance ? formatCurrency(stats.availableBalance) : '••••••'}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Pronto para saque • {currentFeeRate}% de taxa já descontada
                </p>
                <WithdrawalModal 
                  availableBalance={stats.availableBalance}
                  isPremium={isPremiumUser}
                />
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
                <p className="text-xs text-muted-foreground">
                  Liberação automática em até 7 dias
                </p>
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Taxa de {currentFeeRate}% será aplicada na liberação
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Score */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-blue-600/10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium">Score Performance</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((stats.avgRating || 0) * 20)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Baseado em {stats.totalJobs} trabalhos
                </p>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    {(stats.avgRating || 0).toFixed(1)}/5.0
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Receita Mensal */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">
                  {showBalance ? formatCurrency(stats.currentMonthEarnings) : '••••••'}
                </div>
                <p className="text-xs text-success">
                  +{(((stats.currentMonthEarnings || 0) / (stats.totalEarnings || 1)) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Widgets de Performance */}
          <PerformanceWidgets 
            stats={stats} 
            showBalance={showBalance} 
            isPremium={isPremiumUser} 
          />

          {/* Configurações de Saque Automático */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Saque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Saque Automático Semanal</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Toda quinta-feira • Sem taxa • Mínimo de R$ 50,00
                  </p>
                </div>
                <Switch 
                  checked={autoWithdrawal.enabled} 
                  onCheckedChange={(checked) => updateAutoWithdrawal({ enabled: checked })}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">PIX Imediato</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Saque instantâneo a qualquer momento
                  </p>
                  <p className="text-xs text-warning">Taxa: R$ 7,50 por saque</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-success" />
                    <span className="font-medium">Programado</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Próximo saque: Quinta, 28/11
                  </p>
                  <p className="text-xs text-success">Taxa: Gratuito</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          {/* Histórico de Transações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Histórico de Transações
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Todas as movimentações financeiras da sua conta
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {payments.length === 0 && payouts.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Combine and sort all transactions */}
                  {[
                    ...payments.map(p => ({ ...p, category: 'payment' as const })),
                    ...payouts.map(p => ({ ...p, category: 'payout' as const }))
                  ]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 20) // Show last 20 transactions
                    .map((transaction) => {
                      const isPayment = transaction.category === 'payment';
                      const isPayout = transaction.category === 'payout';
                      const transactionType = isPayment ? (transaction as any).type : 'payout';
                      
                      return (
                        <div key={`${transaction.category}-${transaction.id}`} 
                             className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {/* Transaction Icon */}
                            <div className={`p-2 rounded-lg ${
                              isPayout ? 'bg-blue-500/10' :
                              transactionType === 'escrow_received' ? 'bg-success/10' :
                              transactionType === 'job_boost' ? 'bg-warning/10' :
                              'bg-muted/50'
                            }`}>
                              {isPayout ? (
                                <Banknote className="h-4 w-4 text-blue-500" />
                              ) : transactionType === 'escrow_received' ? (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              ) : transactionType === 'job_boost' ? (
                                <Zap className="h-4 w-4 text-warning" />
                              ) : (
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            
                            {/* Transaction Details */}
                            <div>
                              <div className="font-medium">
                                {isPayout ? 'Saque Realizado' :
                                 transactionType === 'escrow_received' ? 'Pagamento Recebido' :
                                 transactionType === 'job_boost' ? 'Boost de Trabalho' :
                                 'Transação'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                          
                          {/* Amount and Status */}
                          <div className="text-right">
                            <div className={`font-semibold ${
                              isPayout ? 'text-blue-500' :
                              transactionType === 'escrow_received' ? 'text-success' :
                              transactionType === 'job_boost' ? 'text-warning' :
                              'text-foreground'
                            }`}>
                              {isPayout || transactionType === 'job_boost' ? '-' : '+'}
                              {formatCurrency(
                                isPayout ? transaction.amount :
                                transactionType === 'escrow_received' ? 
                                  (transaction.amount - ((transaction as any).platform_fee || 0)) :
                                transaction.amount
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant={
                                transaction.status === 'released' || transaction.status === 'completed' ? 'default' :
                                transaction.status === 'held' || transaction.status === 'pending' ? 'secondary' :
                                transaction.status === 'cancelled' ? 'destructive' :
                                'outline'
                              } className="text-xs">
                                {transaction.status === 'released' ? 'Liberado' :
                                 transaction.status === 'held' ? 'Em Garantia' :
                                 transaction.status === 'completed' ? 'Concluído' :
                                 transaction.status === 'pending' ? 'Pendente' :
                                 transaction.status === 'cancelled' ? 'Cancelado' :
                                 transaction.status === 'active' ? 'Ativo' :
                                 transaction.status}
                              </Badge>
                              {isPayment && (transaction as any).platform_fee && (transaction as any).platform_fee > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  (Taxa: {formatCurrency((transaction as any).platform_fee)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
              
              {/* Summary Statistics */}
              <div className="border-t pt-4 mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {payments.filter(p => p.type === 'escrow_received' && p.status === 'released').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Pagamentos Recebidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {payments.filter(p => p.type === 'escrow_received' && p.status === 'held').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Em Garantia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {payouts.filter(p => p.status === 'completed').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Saques Realizados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {payments.filter(p => p.type === 'job_boost').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Boosts Utilizados</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PerformanceWidgets 
            stats={stats} 
            showBalance={showBalance} 
            isPremium={isPremiumUser}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  Saque PIX Imediato
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Disponível 24/7 • Processamento em até 5 minutos
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-500/5 to-blue-600/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Valor Disponível</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(stats.availableBalance)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Taxa: R$ 7,50 • Mínimo: R$ 20,00 • Máximo: R$ 10.000,00
                  </div>
                </div>
                <WithdrawalModal 
                  availableBalance={stats.availableBalance}
                  isPremium={isPremiumUser}
                  type="instant"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-success" />
                  Saque Programado
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toda quinta-feira • Sem taxa adicional
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-success/5 to-success/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Próximo Saque</span>
                    <span className="text-lg font-bold text-success">
                      Quinta, 28/11
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gratuito • Mínimo: R$ 50,00 • Sem limite máximo
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Saque Automático</span>
                  <Switch 
                    checked={autoWithdrawal.enabled} 
                    onCheckedChange={(checked) => updateAutoWithdrawal({ enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Saques */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Saques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.filter(p => p.status === 'completed').length === 0 ? (
                  <div className="text-center py-8">
                    <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum saque realizado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Lista de saques seria renderizada aqui */}
                    <p className="text-sm text-muted-foreground">Saques aparecerão aqui quando realizados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Resumo detalhado de receitas, taxas e performance do mês
                </p>
                <Button 
                  onClick={() => handleGenerateReport('monthly')} 
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Relatório Anual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Balanço completo do ano com gráficos e métricas
                </p>
                <Button 
                  onClick={() => handleGenerateReport('annual')} 
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comprovante IR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Documento para declaração do Imposto de Renda
                </p>
                <Button 
                  onClick={() => handleGenerateReport('tax')} 
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Período de Relatórios */}
          <Card>
            <CardHeader>
              <CardTitle>Personalizar Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Este mês</SelectItem>
                      <SelectItem value="last-month">Mês passado</SelectItem>
                      <SelectItem value="quarter">Este trimestre</SelectItem>
                      <SelectItem value="year">Este ano</SelectItem>
                      <SelectItem value="custom">Período personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="mt-6">
                  Gerar Relatório Custom
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
          
          {/* Notificações de Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de Saque</p>
                  <p className="text-sm text-muted-foreground">
                    Notificar por email quando um saque for solicitado
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Login Suspeito</p>
                  <p className="text-sm text-muted-foreground">
                    Alertar sobre acessos de locais não reconhecidos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Liberação de Pagamentos</p>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando pagamentos forem liberados
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}