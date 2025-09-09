import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Shield, 
  DollarSign, 
  Clock, 
  Calendar, 
  User,
  ArrowLeft,
  CheckCircle,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDirectProposals } from '@/hooks/useDirectProposals';
import { UserLink } from '@/components/ui/user-link';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmStart } = useDirectProposals();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');

  const proposalData = location.state?.proposalData;

  useEffect(() => {
    if (!proposalData) {
      navigate('/');
      return;
    }
  }, [proposalData, navigate]);

  if (!proposalData) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'A combinar';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const platformFee = proposalData.price * 0.05; // 5% platform fee
  const totalAmount = proposalData.price + platformFee;

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm the job start
      const success = await confirmStart(proposalData.proposalId);
      
      if (success) {
        toast({
          title: "Pagamento realizado com sucesso!",
          description: "O trabalho foi iniciado e o prestador foi notificado.",
        });
        navigate('/contracts');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Pagamento</h1>
            <p className="text-muted-foreground">Complete o pagamento para iniciar o trabalho</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Service Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {proposalData.providerName?.charAt(0) || <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{proposalData.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Prestador: <UserLink userId={proposalData.providerId} name={proposalData.providerName} />
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {proposalData.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {proposalData.estimatedHours && (
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duração</p>
                        <p className="font-medium">{proposalData.estimatedHours}h</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Prazo</p>
                      <p className="font-medium">{formatDate(proposalData.deadline)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium text-green-600">{formatCurrency(proposalData.price)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      paymentMethod === 'credit_card' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Cartão de Crédito</p>
                        <p className="text-sm text-muted-foreground">Pagamento seguro via Stripe</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      paymentMethod === 'pix' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
                      <div>
                        <p className="font-medium">PIX</p>
                        <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                      </div>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Valor do serviço</span>
                    <span>{formatCurrency(proposalData.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxa da plataforma (5%)</span>
                    <span>{formatCurrency(platformFee)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Pagar {formatCurrency(totalAmount)}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Pagamento Seguro</strong>
                <br />
                Seus dados são protegidos com criptografia SSL de 256 bits.
              </AlertDescription>
            </Alert>

            {/* Contract Notice */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Contrato Automático</strong>
                <br />
                Um contrato será gerado automaticamente após o pagamento.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}