import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Crown,
  Zap,
  Shield,
  Star,
  CheckCircle,
  Target,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Plus,
  Edit2,
  Clock,
  Users,
  CreditCard,
  Smartphone,
  Settings
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
}

export default function Premium() {
  const { user } = useAuth();
  const { premiumStatus, loading, refetch } = usePremiumStatus();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Novo Notebook',
      targetAmount: 3500,
      currentAmount: 1200,
      targetDate: '2024-06-01',
      category: 'Equipamentos'
    }
  ]);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: 0,
    targetDate: '',
    category: ''
  });

  // Check premium status on load
  useEffect(() => {
    // Premium status is managed by the usePremiumStatus hook
  }, [user]);

  const handleUpgrade = async (paymentMethod: 'card' | 'pix') => {
    if (!user) {
      toast.error('Você precisa estar logado para assinar o premium');
      return;
    }

    try {
      setProcessingPayment(true);
      toast.loading('Criando sessão de pagamento...');

      const { data, error } = await supabase.functions.invoke('create-premium-payment', {
        body: { paymentMethod }
      });

      if (error) {
        // Handle PIX specific errors
        if (error.pixError) {
          toast.dismiss();
          toast.error(error.error || 'PIX não está disponível. Use cartão de crédito.');
          return;
        }
        throw error;
      }

      toast.dismiss();
      toast.success(`Redirecionando para pagamento ${paymentMethod === 'pix' ? 'PIX' : 'cartão'}...`);
      
      // Open payment in new tab
      window.open(data.url, '_blank');
      
      // Refresh status after a short delay
      setTimeout(() => {
        refetch();
      }, 2000);

    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.dismiss();
      toast.error(error.message || 'Erro ao criar pagamento. Tente novamente.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      toast.loading('Abrindo portal do cliente...');

      const { data, error } = await supabase.functions.invoke('create-customer-portal');
      
      if (error) throw error;

      toast.dismiss();
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Erro ao abrir portal do cliente');
    }
  };

  const addGoal = () => {
    if (!newGoal.title || !newGoal.targetAmount) return;
    
    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      targetAmount: newGoal.targetAmount,
      currentAmount: 0,
      targetDate: newGoal.targetDate,
      category: newGoal.category
    };
    
    setGoals([...goals, goal]);
    setNewGoal({ title: '', targetAmount: 0, targetDate: '', category: '' });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Verificando status premium...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const premiumFeatures = [
    {
      icon: Target,
      title: 'Metas Personalizadas',
      description: 'Configure metas de economia e acompanhe seu progresso'
    },
    {
      icon: TrendingUp,
      title: 'Taxas Reduzidas',
      description: 'Apenas 3,5% por transação (vs 4,9% padrão)'
    },
    {
      icon: Star,
      title: 'Prioridade nos Jobs',
      description: 'Seus jobs aparecem em destaque para prestadores'
    },
    {
      icon: Shield,
      title: 'Suporte Premium',
      description: 'Atendimento prioritário e especializado'
    },
    {
      icon: Users,
      title: 'Acesso Antecipado',
      description: 'Seja o primeiro a testar novos recursos'
    },
    {
      icon: Clock,
      title: 'Histórico Avançado',
      description: 'Relatórios detalhados de até 2 anos'
    }
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold">Premium</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Desbloqueie recursos exclusivos, economize nas taxas e tenha uma experiência superior
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg text-muted-foreground line-through">R$ 89,90</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              22% OFF
            </Badge>
          </div>
        </div>

        {/* Premium Status */}
        <Card className="border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                <CardTitle>Status Premium</CardTitle>
              </div>
              <Badge variant={premiumStatus.is_premium ? "default" : "outline"}>
                {premiumStatus.is_premium ? 'ATIVO' : 'INATIVO'}
              </Badge>
            </div>
            <CardDescription>
              {premiumStatus.is_premium 
                ? 'Você tem acesso a todos os recursos premium' 
                : 'Upgrade para premium e tenha acesso a recursos exclusivos'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!premiumStatus.is_premium ? (
              <div className="space-y-3">
                <Button 
                  onClick={() => handleUpgrade('card')} 
                  disabled={processingPayment}
                  className="w-full bg-gradient-to-r from-accent to-accent/80 text-white"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar com Cartão - R$ 69,90/mês
                </Button>
                <Button 
                  onClick={() => handleUpgrade('pix')} 
                  disabled={processingPayment}
                  variant="outline"
                  className="w-full border-accent text-accent hover:bg-accent/10"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Pagar com PIX - R$ 69,90/mês
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Assinatura ativa - Próxima cobrança: {premiumStatus.subscription?.current_period_end ? 
                        new Date(premiumStatus.subscription.current_period_end).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={handleManageSubscription}
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Gerenciar Assinatura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {premiumFeatures.map((feature, index) => (
            <Card key={index} className={`transition-all ${premiumStatus.is_premium ? 'border-accent/20' : 'opacity-60'}`}>
              <CardHeader>
                <feature.icon className={`h-8 w-8 ${premiumStatus.is_premium ? 'text-accent' : 'text-muted-foreground'}`} />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Goals Section - Premium Feature */}
        {premiumStatus.is_premium && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  <CardTitle>Metas Personalizadas</CardTitle>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Meta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Meta</DialogTitle>
                      <DialogDescription>
                        Configure uma meta personalizada para suas economias
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Título da Meta</Label>
                        <Input
                          id="title"
                          value={newGoal.title}
                          onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                          placeholder="Ex: Novo Notebook"
                        />
                      </div>
                      <div>
                        <Label htmlFor="amount">Valor Alvo (R$)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={newGoal.targetAmount || ''}
                          onChange={(e) => setNewGoal({...newGoal, targetAmount: Number(e.target.value)})}
                          placeholder="3500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Categoria</Label>
                        <Input
                          id="category"
                          value={newGoal.category}
                          onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                          placeholder="Ex: Equipamentos"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date">Data Alvo</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newGoal.targetDate}
                          onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                        />
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
              <div className="space-y-4">
                {goals.map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                    <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{goal.title}</h4>
                          <p className="text-sm text-muted-foreground">{goal.category}</p>
                        </div>
                        <Badge variant="outline">{progress.toFixed(0)}%</Badge>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          R$ {goal.currentAmount.toLocaleString()} de R$ {goal.targetAmount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Comparação de Taxas</CardTitle>
            <CardDescription>Veja quanto você economiza com o Premium</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-muted rounded-full"></div>
                  <span className="font-medium">Plano Gratuito</span>
                </div>
                <div className="text-2xl font-bold mb-1">4,9%</div>
                <p className="text-sm text-muted-foreground">Taxa por transação</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div>Em R$ 1.000: <span className="font-medium">R$ 49,00</span></div>
                  <div>Em R$ 5.000: <span className="font-medium">R$ 245,00</span></div>
                </div>
              </div>
              
              <div className="p-4 border-2 border-accent rounded-lg bg-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-3 h-3 text-accent" />
                  <span className="font-medium text-accent">Premium</span>
                </div>
                <div className="text-2xl font-bold mb-1">3,5%</div>
                <p className="text-sm text-muted-foreground">Taxa por transação</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div>Em R$ 1.000: <span className="font-medium text-green-600">R$ 35,00</span></div>
                  <div>Em R$ 5.000: <span className="font-medium text-green-600">R$ 175,00</span></div>
                </div>
                <div className="mt-2 text-xs text-green-600 font-medium">
                  Economia de R$ 70,00 em R$ 5.000!
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}