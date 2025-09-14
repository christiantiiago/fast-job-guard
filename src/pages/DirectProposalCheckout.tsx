import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  User, 
  Clock, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Shield, 
  FileText,
  CheckCircle 
} from 'lucide-react';

export default function DirectProposalCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { calculateFees, formatCurrency } = useFeeRules();
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [processing, setProcessing] = useState(false);

  const proposalData = location.state;

  if (!proposalData || proposalData.type !== 'direct_proposal') {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 md:p-6 max-w-2xl">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Proposta não encontrada</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível encontrar os dados da proposta.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const fees = calculateFees(proposalData.price);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handlePayment = async () => {
    if (!user) return;
    
    setProcessing(true);
    
    try {
      // Create escrow payment with Stripe
      const response = await supabase.functions.invoke('create-escrow-payment', {
        body: {
          jobId: proposalData.proposalId, // Using proposal ID as job reference
          providerId: proposalData.providerId,
          amount: proposalData.price,
          platformFee: fees.platformFee,
          paymentMethod: paymentMethod === 'credit-card' ? 'card' : 'pix'
        }
      });

      if (response.error) throw response.error;

      const { sessionUrl, sessionId, escrowPaymentId } = response.data;
      
      if (sessionUrl) {
        // Update proposal status to confirmed
        const { error: proposalError } = await supabase
          .from('direct_proposals')
          .update({ status: 'confirmed' })
          .eq('id', proposalData.proposalId);

        if (proposalError) throw proposalError;

        // Store payment info for later reference
        localStorage.setItem('pendingDirectProposalPayment', JSON.stringify({
          proposalId: proposalData.proposalId,
          escrowPaymentId,
          sessionId
        }));

        // Redirect to Stripe checkout
        window.open(sessionUrl, '_blank');
        
        toast({
          title: "Redirecionando para Pagamento",
          description: "Você será redirecionado para completar o pagamento com segurança.",
        });

        navigate('/dashboard');
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
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold mt-4">Finalizar Contratação</h1>
          <p className="text-muted-foreground">Proposta Direta</p>
        </div>

        <div className="space-y-6">
          {/* Service Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resumo do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{proposalData.title}</h3>
                  <p className="text-muted-foreground mt-1">{proposalData.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(proposalData.price)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-3 border-t">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={proposalData.providerAvatar} />
                  <AvatarFallback>
                    {proposalData.providerName?.charAt(0) || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{proposalData.providerName}</p>
                  <p className="text-sm text-muted-foreground">Prestador de Serviços</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t">
                {proposalData.estimatedHours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Duração: {proposalData.estimatedHours}h</span>
                  </div>
                )}
                
                {proposalData.deadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Prazo: {formatDate(proposalData.deadline)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Valor do serviço</span>
                  <span>{formatCurrency(proposalData.price)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa da plataforma (7,5%)</span>
                  <span>{formatCurrency(fees.platformFee)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total a pagar</span>
                  <span className="text-primary">{formatCurrency(fees.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Action Buttons */}
          <div className="flex gap-3">
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
              onClick={() => navigate('/dashboard')}
              disabled={processing}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}