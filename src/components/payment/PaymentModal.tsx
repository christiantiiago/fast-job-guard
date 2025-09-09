import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFeeRules } from '@/hooks/useFeeRules';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  Smartphone, 
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
  const { toast } = useToast();
  const { user } = useAuth();
  const { calculateFees, formatCurrency } = useFeeRules();
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [processing, setProcessing] = useState(false);

  const fees = calculateFees(proposal.price);

  const handlePayment = async () => {
    if (!user) return;
    
    setProcessing(true);
    
    try {
      // Create escrow payment with Stripe
      const response = await supabase.functions.invoke('create-escrow-payment', {
        body: {
          jobId: jobId,
          providerId: proposal.provider_id,
          amount: proposal.price,
          platformFee: fees.platformFee,
          paymentMethod: paymentMethod === 'credit-card' ? 'card' : 'pix'
        }
      });

      if (response.error) throw response.error;

      const { sessionUrl, sessionId, escrowPaymentId } = response.data;
      
      if (sessionUrl) {
        // Accept the proposal before redirecting to payment
        const { error: proposalError } = await supabase
          .from('proposals')
          .update({ status: 'accepted' })
          .eq('id', proposal.id);

        if (proposalError) throw proposalError;

        // Store payment info for later reference
        localStorage.setItem('pendingPayment', JSON.stringify({
          jobId,
          proposalId: proposal.id,
          escrowPaymentId,
          sessionId
        }));

        // Redirect to Stripe checkout
        window.open(sessionUrl, '_blank');
        
        toast({
          title: "Redirecionando para Pagamento",
          description: "Você será redirecionado para completar o pagamento com segurança.",
        });

        onPaymentSuccess();
        onClose();
      }
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Erro no Pagamento",
        description: error.message || "Não foi possível processar o pagamento. Tente novamente.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Finalizar Contratação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pb-4">
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

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold">Forma de Pagamento</h3>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="credit-card" id="credit-card" />
                  <Label htmlFor="credit-card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Cartão de Crédito</div>
                        <div className="text-sm text-muted-foreground">
                          Visa, Mastercard, American Express
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">PIX</div>
                        <div className="text-sm text-muted-foreground">
                          Pagamento instantâneo
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

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
              disabled={processing}
              className="flex-1"
              size="lg"
            >
              {processing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Contratar por {formatCurrency(fees.total)}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}