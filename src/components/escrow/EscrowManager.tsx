import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Calendar
} from 'lucide-react';

interface EscrowPayment {
  id: string;
  job_id: string;
  amount: number;
  platform_fee: number;
  total_amount: number;
  status: string;
  release_date: string;
  created_at: string;
  completed_at?: string;
}

interface EscrowManagerProps {
  jobId: string;
  isClient?: boolean;
}

export function EscrowManager({ jobId, isClient = false }: EscrowManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [escrowPayment, setEscrowPayment] = useState<EscrowPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const fetchEscrowPayment = async () => {
    try {
      const { data, error } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      if (data) {
        setEscrowPayment(data);
      }
    } catch (error) {
      console.error('Error fetching escrow payment:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrowPayment();

    // Setup realtime subscription for escrow updates
    const channel = supabase
      .channel('escrow-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_payments',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchEscrowPayment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  // Countdown timer for automatic release
  useEffect(() => {
    if (!escrowPayment || escrowPayment.status !== 'held') {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const releaseDate = new Date(escrowPayment.release_date);
      const now = new Date();
      const timeDiff = releaseDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining('Liberação disponível');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [escrowPayment]);

  const handleReleasePayment = async () => {
    if (!escrowPayment || !user) return;

    setReleasing(true);
    try {
      const response = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          escrowPaymentId: escrowPayment.id,
          releaseType: 'manual'
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Pagamento Liberado!",
        description: "O pagamento foi liberado com sucesso para o prestador.",
      });

      // Refresh the data
      await fetchEscrowPayment();
    } catch (error) {
      console.error('Error releasing payment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao liberar pagamento",
      });
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!escrowPayment) {
    return null; // No escrow payment for this job
  }

  const isHeld = escrowPayment.status === 'held';
  const isReleased = escrowPayment.status === 'released';
  const isPending = escrowPayment.status === 'pending';
  const releaseDate = new Date(escrowPayment.release_date);
  const now = new Date();
  const daysUntilRelease = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const canRelease = daysUntilRelease <= 0; // Can release when deadline passed or immediately

  const getStatusBadge = () => {
    switch (escrowPayment.status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Aguardando Pagamento</Badge>;
      case 'held':
        return <Badge className="bg-blue-100 text-blue-700">Em Garantia</Badge>;
      case 'released':
        return <Badge className="bg-green-100 text-green-700">Liberado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{escrowPayment.status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Pagamento em Garantia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status</span>
          {getStatusBadge()}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Valor</span>
          <span className="font-semibold flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            R$ {escrowPayment.amount.toFixed(2)}
          </span>
        </div>

        {escrowPayment.platform_fee > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Taxa da plataforma</span>
            <span>R$ {escrowPayment.platform_fee.toFixed(2)}</span>
          </div>
        )}

        {isHeld && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Liberação automática</span>
              <span className="flex items-center gap-1 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                <Clock className="h-4 w-4" />
                {timeRemaining || `${daysUntilRelease > 0 ? `${daysUntilRelease} dias` : 'Hoje'}`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Trabalho concluído</span>
                <span>Liberação automática</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    canRelease ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(10, 100 - (daysUntilRelease * 20)))}%`
                  }}
                />
              </div>
            </div>

            {canRelease && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  O prazo para liberação automática foi atingido. O pagamento pode ser liberado a qualquer momento ou será liberado automaticamente.
                </AlertDescription>
              </Alert>
            )}

            {!canRelease && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  O prestador marcou o trabalho como concluído. Você tem até {new Date(releaseDate).toLocaleDateString('pt-BR')} para revisar e liberar o pagamento.
                </AlertDescription>
              </Alert>
            )}

            {isClient && (
              <div className="pt-4 border-t">
                <Alert className="mb-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Como funciona:</strong> Você pode liberar o pagamento imediatamente se estiver satisfeito com o serviço, ou aguardar até a liberação automática. O pagamento será processado com a taxa aplicada baseada no status premium do prestador.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleReleasePayment}
                  disabled={releasing}
                  className="w-full"
                  size="lg"
                  variant={canRelease ? "default" : "secondary"}
                >
                  {releasing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {canRelease ? 'Liberar Pagamento Agora' : 'Liberar Pagamento'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {isReleased && escrowPayment.completed_at && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Pagamento liberado em {new Date(escrowPayment.completed_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {isPending && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O pagamento ainda está sendo processado. Aguarde a confirmação.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}