import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AbacatePaySuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const paymentId = searchParams.get('payment_id');
  const paymentType = searchParams.get('type');

  useEffect(() => {
    const updatePaymentStatus = async () => {
      if (!paymentId) return;

      try {
        setLoading(true);

        // Simular confirmação do pagamento
        setTimeout(() => {
          toast({
            title: "Pagamento Confirmado!",
            description: "Seu pagamento foi processado com sucesso.",
          });
          setLoading(false);
        }, 1500);

      } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        toast({
          title: "Aviso",
          description: "Não foi possível confirmar o pagamento automaticamente, mas ele será processado em breve.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    updatePaymentStatus();
  }, [paymentId, paymentType, toast]);

  const getSuccessMessage = () => {
    switch (paymentType) {
      case 'premium':
        return {
          title: 'Assinatura Premium Ativada!',
          description: 'Sua assinatura premium foi ativada com sucesso. Aproveite todos os benefícios exclusivos.',
          action: 'Ir para Dashboard'
        };
      case 'boost':
        return {
          title: 'Job Impulsionado!',
          description: 'Seu trabalho foi impulsionado com sucesso e já está recebendo maior visibilidade.',
          action: 'Ver Meus Jobs'
        };
      case 'job':
        return {
          title: 'Contratação Realizada!',
          description: 'O serviço foi contratado com sucesso. O valor está em garantia até a conclusão.',
          action: 'Ver Contratos'
        };
      case 'direct_proposal':
        return {
          title: 'Proposta Confirmada!',
          description: 'Sua proposta direta foi confirmada e o pagamento está em garantia. O prestador já foi notificado.',
          action: 'Ver Dashboard'
        };
      default:
        return {
          title: 'Pagamento Confirmado!',
          description: 'Seu pagamento foi processado com sucesso.',
          action: 'Continuar'
        };
    }
  };

  const handleNavigation = () => {
    switch (paymentType) {
      case 'boost':
        navigate('/jobs');
        break;
      case 'job':
        navigate('/contracts');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 md:p-6 max-w-2xl">
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="text-xl font-semibold mb-2">Confirmando Pagamento</h2>
              <p className="text-muted-foreground">
                Aguarde enquanto confirmamos seu pagamento...
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const successInfo = getSuccessMessage();

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">{successInfo.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">
              {successInfo.description}
            </p>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">ID do Pagamento:</span>
                <Badge variant="outline">{paymentId}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Início
              </Button>
              <Button
                onClick={handleNavigation}
                className="flex-1"
              >
                {successInfo.action}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}