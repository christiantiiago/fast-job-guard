import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinanceData } from '@/hooks/useFinanceData';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  CreditCard,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User,
  Building
} from 'lucide-react';

export function ComprehensiveFinanceView() {
  const { payments, stats, loading } = useFinanceData();
  const [activeTab, setActiveTab] = useState('all');

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

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'boost') return <Zap className="h-4 w-4 text-orange-500" />;
    if (type === 'escrow') return <CreditCard className="h-4 w-4 text-blue-500" />;
    return amount > 0 ? 
      <ArrowUpRight className="h-4 w-4 text-green-500" /> : 
      <ArrowDownRight className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: string, type: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
      held: { color: 'bg-blue-100 text-blue-800', label: 'Em Garantia' },
      released: { color: 'bg-green-100 text-green-800', label: 'Liberado' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Concluído' },
      active: { color: 'bg-blue-100 text-blue-800', label: 'Ativo' },
      expired: { color: 'bg-gray-100 text-gray-800', label: 'Expirado' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Falhou' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filterTransactions = (tabValue: string) => {
    switch (tabValue) {
      case 'earnings':
        return payments.filter(p => p.amount > 0);
      case 'expenses':
        return payments.filter(p => p.amount < 0);
      case 'pending':
        return payments.filter(p => p.status === 'pending' || p.status === 'held');
      case 'completed':
        return payments.filter(p => p.status === 'released' || p.status === 'completed');
      default:
        return payments;
    }
  };

  const filteredTransactions = filterTransactions(activeTab);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Ganho</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.pendingAmount || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gastos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats?.totalExpenses || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(stats?.availableBalance || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Financeiro Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="earnings">Ganhos</TabsTrigger>
              <TabsTrigger value="expenses">Gastos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação encontrada para este filtro.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-muted">
                          {getTransactionIcon(transaction.type, transaction.amount)}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-medium">{transaction.job_title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{transaction.client_name}</span>
                            <span>•</span>
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(transaction.created_at)}</span>
                            <span>•</span>
                            <span className="capitalize">{transaction.type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </span>
                          {getStatusBadge(transaction.status, transaction.type)}
                        </div>
                        
                        {transaction.type === 'escrow' && transaction.release_date && transaction.status === 'held' && (
                          <p className="text-xs text-muted-foreground">
                            Liberação: {formatDate(transaction.release_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}