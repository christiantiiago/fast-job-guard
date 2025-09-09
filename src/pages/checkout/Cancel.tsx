import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { 
  XCircle, 
  ArrowLeft, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function CheckoutCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const jobId = searchParams.get('job_id');

  useEffect(() => {
    // Clear any pending payment data
    localStorage.removeItem('pendingPayment');

    toast({
      variant: "destructive",
      title: "Pagamento Cancelado",
      description: "O pagamento foi cancelado. Você pode tentar novamente quando quiser.",
    });
  }, [toast]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 mx-auto">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-700">
                Pagamento Cancelado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground">
                  O pagamento foi cancelado e nenhuma cobrança foi realizada.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">O que aconteceu?</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Você cancelou o processo de pagamento ou fechou a janela antes de completar a transação.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Você pode:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Tentar o pagamento novamente
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar aos detalhes do job
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                {jobId && (
                  <Button
                    onClick={() => navigate(`/jobs/${jobId}`)}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}