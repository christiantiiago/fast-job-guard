import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  Shield,
  ArrowRight
} from 'lucide-react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  const sessionId = searchParams.get('session_id');
  const jobId = searchParams.get('job_id');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!sessionId || !jobId) {
          throw new Error('Missing payment information');
        }

        // Get payment data from localStorage
        const pendingPayment = localStorage.getItem('pendingPayment');
        if (pendingPayment) {
          const data = JSON.parse(pendingPayment);
          if (data.jobId === jobId && data.sessionId === sessionId) {
            setPaymentData(data);
            // Clear the stored data
            localStorage.removeItem('pendingPayment');
          }
        }

        // Fetch job details
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            profiles:client_id(full_name),
            provider_profile:provider_id(full_name, avatar_url)
          `)
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        setPaymentData(prev => ({ ...prev, job }));

        toast({
          title: "Pagamento Confirmado!",
          description: "O pagamento foi processado com sucesso e o contrato foi gerado.",
        });

      } catch (error) {
        console.error('Error verifying payment:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível verificar o pagamento.",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, jobId, toast]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!paymentData?.job) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Informações de pagamento não encontradas.</p>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="mt-4"
              >
                Ir para Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-700 mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-lg text-muted-foreground">
              Seu pagamento foi processado com sucesso
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Detalhes do Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-100 text-green-700">
                    Em Garantia
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold">
                    R$ {paymentData.job.final_price?.toFixed(2) || '0,00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestador</span>
                  <span>{paymentData.job.provider_profile?.full_name || 'N/A'}</span>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    <strong>Pagamento Seguro:</strong> O valor ficará em garantia até a conclusão do serviço.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Detalhes do Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{paymentData.job.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {paymentData.job.description}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status do Job</span>
                  <Badge variant="outline">
                    Em Andamento
                  </Badge>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Contrato Gerado:</strong> Um contrato foi criado automaticamente entre você e o prestador.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Chat Liberado</h4>
                    <p className="text-sm text-muted-foreground">
                      Converse diretamente com o prestador sobre os detalhes do serviço.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Acompanhe o Progresso</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitore o andamento do trabalho através do dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Libere o Pagamento</h4>
                    <p className="text-sm text-muted-foreground">
                      Após a conclusão, libere o pagamento para o prestador.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mt-8">
            <Button
              onClick={() => navigate(`/chat/${jobId}`)}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Ir para Chat
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Ver Dashboard
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}