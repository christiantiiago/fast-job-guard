import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, Star, Crown, Rocket, Target } from 'lucide-react';
import { toast } from 'sonner';
import { AbacatePayModal } from '@/components/payment/AbacatePayModal';
import { BOOST_OPTIONS } from '@/lib/stripe';

interface JobBoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  jobId: string;
}

export function JobBoostModal({ open, onOpenChange, jobTitle, jobId }: JobBoostModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const boostOptions = BOOST_OPTIONS.map(option => ({
    ...option,
    icon: option.id === 'express' ? Zap :
          option.id === 'turbo' ? Rocket :
          option.id === 'premium' ? Star :
          option.id === 'platinum' ? Crown :
          option.id === 'diamond' ? Target :
          TrendingUp,
    color: option.id === 'express' ? 'bg-yellow-500' :
           option.id === 'turbo' ? 'bg-orange-500' :
           option.id === 'premium' ? 'bg-purple-500' :
           option.id === 'platinum' ? 'bg-blue-500' :
           option.id === 'diamond' ? 'bg-pink-500' :
           'bg-gradient-to-r from-purple-500 to-pink-500'
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleBoost = (option: any) => {
    setPaymentData({
      jobId,
      boostType: option.id,
      duration: getDurationInHours(option.duration)
    });
    setShowPaymentModal(true);
  };

  const getDurationInHours = (duration: string): number => {
    const durationMap: Record<string, number> = {
      '5 horas': 5,
      '2 dias': 48,
      '1 semana': 168,
      '2 semanas': 336,
      '1 mês': 720,
      '3 meses': 2160
    };
    return durationMap[duration] || 24;
  };

  return (
    <>
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
                    >
                      {`Impulsionar com ${option.title}`}
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

      {paymentData && (
        <AbacatePayModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentData(null);
          }}
          amount={BOOST_OPTIONS.find(o => o.id === paymentData.boostType)?.price || 0}
          description={`Boost ${BOOST_OPTIONS.find(o => o.id === paymentData.boostType)?.title} - ${jobTitle}`}
          paymentType="boost"
          paymentData={paymentData}
        />
      )}
    </>
  );
}