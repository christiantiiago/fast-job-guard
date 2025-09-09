import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Star, Zap, Target, ArrowRight, Shield } from 'lucide-react';

interface PromoItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  isNew?: boolean;
  gradient: string;
  icon: any;
}

interface PromoCarouselProps {
  userRole: 'client' | 'provider';
}

export function PromoCarousel({ userRole }: PromoCarouselProps) {
  const providerPromos: PromoItem[] = [
    {
      id: '1',
      title: 'Vale Gasolina',
      subtitle: 'R$ 200 para você!',
      description: 'Trabalhe conosco durante dezembro e ganhe um Vale Gasolina de R$200,00. Nova parceria exclusiva!',
      buttonText: 'Saiba Mais',
      isNew: true,
      gradient: 'from-red-500 to-pink-600',
      icon: Gift
    },
    {
      id: '2',
      title: 'Bônus Semanal',
      subtitle: 'Até R$ 500 extras',
      description: 'Complete 10 jobs na semana e ganhe bônus progressivo. Quanto mais você trabalha, mais você ganha!',
      buttonText: 'Ver Detalhes',
      gradient: 'from-green-500 to-emerald-600',
      icon: Star
    },
    {
      id: '3',
      title: 'Turbo Boost',
      subtitle: 'Jobs premium',
      description: 'Acesso prioritário aos melhores jobs da sua região. Seja o primeiro a receber as oportunidades!',
      buttonText: 'Ativar Turbo',
      gradient: 'from-blue-500 to-cyan-600',
      icon: Zap
    }
  ];

  const clientPromos: PromoItem[] = [
    {
      id: '1',
      title: 'Job Fast Premium',
      subtitle: 'Sem limites',
      description: 'Publique quantos jobs quiser, com prioridade na busca e suporte exclusivo 24/7.',
      buttonText: 'Assinar Premium',
      isNew: true,
      gradient: 'from-purple-500 to-violet-600',
      icon: Star
    },
    {
      id: '2',
      title: 'Primeira Contratação',
      subtitle: '20% OFF',
      description: 'Desconto especial na sua primeira contratação. Encontre o profissional ideal com economia!',
      buttonText: 'Usar Desconto',
      gradient: 'from-orange-500 to-red-600',
      icon: Target
    },
    {
      id: '3',
      title: 'Garantia Total',
      subtitle: '100% seguro',
      description: 'Todos os serviços com garantia. Se não ficar satisfeito, seu dinheiro de volta!',
      buttonText: 'Ver Garantia',
      gradient: 'from-green-500 to-teal-600',
      icon: Shield
    }
  ];

  const promos = userRole === 'provider' ? providerPromos : clientPromos;

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent>
        {promos.map((promo) => {
          const IconComponent = promo.icon;
          return (
            <CarouselItem key={promo.id}>
              <Card className="relative overflow-hidden border-0 p-0">
                <div className={`bg-gradient-to-br ${promo.gradient} p-6 text-white relative`}>
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full -translate-y-16 translate-x-16" />
                    <div className="absolute right-16 bottom-0 w-24 h-24 bg-white/10 rounded-full translate-y-8" />
                    <div className="absolute left-8 top-8 w-16 h-16 bg-white/5 rounded-full" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        {promo.isNew && (
                          <Badge className="mb-2 bg-white/20 text-white hover:bg-white/25 border-0">
                            Novo!
                          </Badge>
                        )}
                        
                        <h2 className="text-xl font-bold mb-1">{promo.title}</h2>
                        <h3 className="text-lg font-semibold mb-2">{promo.subtitle}</h3>
                        <p className="text-white/90 text-sm mb-4 leading-relaxed">
                          {promo.description}
                        </p>
                        
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-white/20 text-white hover:bg-white/30 border-0"
                        >
                          {promo.buttonText}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}