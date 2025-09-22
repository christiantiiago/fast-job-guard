import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, Star, Crown, Rocket, Target } from 'lucide-react';
import { toast } from 'sonner';

interface JobBoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  jobId: string;
}

interface BoostOption {
  id: string;
  title: string;
  duration: string;
  price: number;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  popular?: boolean;
  premium?: boolean;
}

export function JobBoostModal({ open, onOpenChange, jobTitle, jobId }: JobBoostModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const boostOptions: BoostOption[] = [
    {
      id: 'express',
      title: 'Express',
      duration: '5 horas',
      price: 19.99,
      description: 'Boost rápido para resultados imediatos',
      icon: Zap,
      color: 'bg-yellow-500',
      features: ['Destaque por 5 horas', 'Posição no topo', 'Badge "Urgente"']
    },
    {
      id: 'turbo',
      title: 'Turbo',
      duration: '2 dias',
      price: 23.99,
      description: 'Máxima visibilidade por 48 horas',
      icon: Rocket,
      color: 'bg-orange-500',
      features: ['Destaque por 2 dias', 'Posição premium', 'Badge "Popular"', 'Notificação push'],
      popular: true
    },
    {
      id: 'premium',
      title: 'Premium',
      duration: '1 semana',
      price: 39.99,
      description: 'Visibilidade garantida por uma semana',
      icon: Star,
      color: 'bg-purple-500',
      features: ['Destaque por 7 dias', 'Posição VIP', 'Badge "Premium"', 'Analytics detalhado']
    },
    {
      id: 'platinum',
      title: 'Platinum',
      duration: '2 semanas',
      price: 59.99,
      description: 'Máximo alcance por 14 dias',
      icon: Crown,
      color: 'bg-blue-500',
      features: ['Destaque por 14 dias', 'Posição destaque', 'Badge "Platinum"', 'Suporte prioritário']
    },
    {
      id: 'diamond',
      title: 'Diamond',
      duration: '1 mês',
      price: 89.99,
      description: 'Visibilidade máxima por 30 dias',
      icon: Target,
      color: 'bg-pink-500',
      features: ['Destaque por 30 dias', 'Posição exclusiva', 'Badge "Diamond"', 'Relatórios avançados'],
      premium: true
    },
    {
      id: 'ultimate',
      title: 'Ultimate',
      duration: '3 meses',
      price: 199.99,
      description: 'O mais completo por 90 dias',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      features: ['Destaque por 90 dias', 'Posição ultra premium', 'Badge "Ultimate"', 'Gerente dedicado'],
      premium: true
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleBoost = async (option: BoostOption) => {
    setLoading(true);
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Boost ${option.title} ativado!`, {
        description: `Seu trabalho "${jobTitle}" está em destaque por ${option.duration}`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao ativar boost', {
        description: 'Tente novamente em alguns instantes'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Impulsionar Trabalho
          </DialogTitle>
          <DialogDescription className="text-base">
            Aumente a visibilidade do trabalho "{jobTitle}" e receba mais propostas qualificadas
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {boostOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedOption === option.id;
            
            return (
              <Card 
                key={option.id}
                className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                  isSelected ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
                } ${option.popular ? 'ring-2 ring-primary/20' : ''}`}
                onClick={() => setSelectedOption(option.id)}
              >
                {option.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                {option.premium && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      Premium
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={`w-16 h-16 mx-auto rounded-full ${option.color} flex items-center justify-center text-white mb-3`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                  <CardDescription className="text-sm">{option.description}</CardDescription>
                  
                  <div className="mt-3">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(option.price)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      por {option.duration}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full mt-4 ${isSelected ? 'bg-primary hover:bg-primary/90' : ''}`}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBoost(option);
                    }}
                    disabled={loading}
                  >
                    {loading && selectedOption === option.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </div>
                    ) : (
                      `Impulsionar com ${option.title}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Como funciona o boost?
          </h4>
          <p className="text-sm text-muted-foreground">
            O boost coloca seu trabalho em posições de destaque, aumentando a visibilidade para prestadores qualificados. 
            Trabalhos impulsionados recebem em média 3x mais propostas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}