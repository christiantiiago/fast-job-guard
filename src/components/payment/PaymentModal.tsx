import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useAuth } from '@/hooks/useAuth';
import { AbacatePayModal } from '@/components/payment/AbacatePayModal';
import { PaymentStatusChecker } from '@/components/payment/PaymentStatusChecker';
import { DuplicatePaymentGuard } from '@/components/payment/DuplicatePaymentGuard';
import { 
  Shield, 
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  User
} from 'lucide-react';

interface Proposal {
  id: string;
  provider_id: string;
  price: number;
  message: string;
  estimated_hours?: number;
  delivery_date?: string;
}

interface ProviderProfile {
  full_name?: string;
  avatar_url?: string;
  rating_avg?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal;
  providerProfile: ProviderProfile | null;
  jobId: string;
  jobTitle: string;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  proposal, 
  providerProfile, 
  jobId, 
  jobTitle,
  onPaymentSuccess 
}: PaymentModalProps) {
  const { user } = useAuth();
  const { calculateFees, formatCurrency } = useFeeRules();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [guardLoaded, setGuardLoaded] = useState(false);

  const fees = calculateFees(proposal.price);

  const handlePayment = () => {
    if (canProceed) {
      setShowPaymentModal(true);
    }
  };

  const handleCanProceed = (canProceed: boolean) => {
    setCanProceed(canProceed);
    setGuardLoaded(true);
  };

  const handleExistingPayment = (paymentData: any) => {
    setExistingPayment(paymentData);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Finalizar Contratação
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pb-4">
            {/* Duplicate Payment Guard */}
            <DuplicatePaymentGuard
              jobId={jobId}
              onCanProceed={handleCanProceed}
              onExistingPayment={handleExistingPayment}
            />

            {/* Service Summary */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{jobTitle}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {providerProfile?.full_name}
                      </span>
                      {providerProfile?.rating_avg && (
                        <Badge variant="secondary" className="text-xs">
                          ⭐ {providerProfile.rating_avg.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(proposal.price)}
                    </p>
                  </div>
                </div>

                {proposal.estimated_hours && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Duração estimada: {proposal.estimated_hours}h</span>
                  </div>
                )}

                {proposal.delivery_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Entrega: {new Date(proposal.delivery_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold">Resumo do Pagamento</h3>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span>Valor do serviço</span>
                  <span>{formatCurrency(proposal.price)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa da plataforma ({fees.feePercentage}%)</span>
                  <span>{formatCurrency(fees.platformFee)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total a pagar</span>
                  <span className="text-primary">{formatCurrency(fees.total)}</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Pagamento Seguro e Protegido:</strong></p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Valor fica em garantia até a conclusão do serviço</li>
                    <li>Contrato automático entre cliente e prestador</li>
                    <li>Chat liberado para comunicação direta</li>
                    <li>Sistema de disputas disponível se necessário</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Contract Terms */}
            <Alert className="border-amber-200 bg-amber-50">
              <FileText className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Termos do Contrato:</strong> Ao prosseguir, um contrato será gerado automaticamente entre você e o prestador. 
                A JobFast atua apenas como intermediadora, conectando clientes e prestadores, sem assumir responsabilidade pela execução dos serviços.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePayment}
                className="flex-1"
                size="lg"
                disabled={!canProceed || !guardLoaded}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {!guardLoaded ? 'Verificando...' : 
                 !canProceed ? 'Pagamento já existe' : 
                 `Contratar por ${formatCurrency(fees.total)}`}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AbacatePayModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          onPaymentSuccess();
          onClose();
        }}
        amount={fees.total}
        description={`Contratação - ${jobTitle}`}
        paymentType="job"
        paymentData={{
          jobId,
          providerId: proposal.provider_id,
          serviceAmount: proposal.price,
          platformFee: fees.platformFee,
          proposalId: proposal.id
        }}
      />
    </>
  );
}