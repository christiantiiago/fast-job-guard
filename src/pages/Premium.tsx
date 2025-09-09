import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Users
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
  const [isPremium, setIsPremium] = useState(false);
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
            Desbloqueie recursos exclusivos e tenha uma experiência superior na plataforma
          </p>
        </div>

        {/* Premium Status */}
        <Card className="border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                <CardTitle>Status Premium</CardTitle>
              </div>
              <Badge variant={isPremium ? "default" : "outline"}>
                {isPremium ? 'ATIVO' : 'INATIVO'}
              </Badge>
            </div>
            <CardDescription>
              {isPremium 
                ? 'Você tem acesso a todos os recursos premium' 
                : 'Upgrade para premium e tenha acesso a recursos exclusivos'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isPremium && (
              <Button 
                onClick={() => setIsPremium(true)} 
                className="w-full bg-gradient-to-r from-accent to-accent/80 text-white"
              >
                <Crown className="mr-2 h-4 w-4" />
                Ativar Premium - R$ 29,90/mês
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {premiumFeatures.map((feature, index) => (
            <Card key={index} className={`transition-all ${isPremium ? 'border-accent/20' : 'opacity-60'}`}>
              <CardHeader>
                <feature.icon className={`h-8 w-8 ${isPremium ? 'text-accent' : 'text-muted-foreground'}`} />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Goals Section - Premium Feature */}
        {isPremium && (
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