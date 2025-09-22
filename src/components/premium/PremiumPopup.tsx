import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { AbacatePayModal } from '@/components/payment/AbacatePayModal';
import { 
  Crown,
  Star,
  Shield,
  Target,
  TrendingUp,
  X,
  Zap
} from 'lucide-react';

interface PremiumPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumPopup = ({ isOpen, onClose }: PremiumPopupProps) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const features = [
    { icon: Target, text: 'Metas personalizadas' },
    { icon: TrendingUp, text: 'Taxas reduzidas (3,5%)' },
    { icon: Star, text: 'Prioridade nos jobs' },
    { icon: Shield, text: 'Suporte premium' },
  ];

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-accent" />
                <DialogTitle>Upgrade para Premium</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Desbloqueie recursos exclusivos e economize nas taxas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Price */}
            <div className="text-center p-4 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg">
              <div className="text-2xl font-bold text-accent">R$ 69,90</div>
              <div className="text-sm text-muted-foreground">por mês</div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <feature.icon className="h-5 w-5 text-accent" />
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Savings highlight */}
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Economize R$ 70 em cada R$ 5.000!
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Agora Não
              </Button>
              <Button
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-accent to-accent/80"
              >
                <Crown className="mr-2 h-4 w-4" />
                Assinar Premium
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AbacatePayModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          onClose();
        }}
        amount={69.90}
        description="Assinatura Premium Mensal"
        paymentType="premium"
      />
    </>
  );
};