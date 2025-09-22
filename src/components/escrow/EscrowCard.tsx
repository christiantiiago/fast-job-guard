import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  Unlock
} from 'lucide-react';

interface EscrowPayment {
  id: string;
  amount: number;
  total_amount: number;
  platform_fee: number;
  status: string;
  release_date: string;
  created_at: string;
  completed_at?: string;
  job_id: string;
  client_id: string;
  provider_id: string;
}

interface EscrowCardProps {
  escrowPayment: EscrowPayment;
  isClient?: boolean;
  onUpdate?: () => void;
}

export function EscrowCard({ escrowPayment, isClient = false, onUpdate }: EscrowCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [releasing, setReleasing] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [hoursLeft, setHoursLeft] = useState(0);
  const [canRelease, setCanRelease] = useState(false);

  useEffect(() => {
    if (escrowPayment.status === 'held') {
      const releaseDate = new Date(escrowPayment.release_date);
      const now = new Date();
      const timeDiff = releaseDate.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        setDaysLeft(days);
        setHoursLeft(hours);
        setCanRelease(days <= 0 && hours <= 0);
      } else {
        setDaysLeft(0);
        setHoursLeft(0);
        setCanRelease(true);
      }

      // Atualizar a cada minuto
      const interval = setInterval(() => {
        const newNow = new Date();
        const newTimeDiff = releaseDate.getTime() - newNow.getTime();
        
        if (newTimeDiff > 0) {
          const newDays = Math.floor(newTimeDiff / (1000 * 60 * 60 * 24));
          const newHours = Math.floor((newTimeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          setDaysLeft(newDays);
          setHoursLeft(newHours);
          setCanRelease(newDays <= 0 && newHours <= 0);
        } else {
          setDaysLeft(0);
          setHoursLeft(0);
          setCanRelease(true);
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [escrowPayment.release_date, escrowPayment.status]);

  const handleReleasePayment = async () => {
    if (!user || !isClient) return;
    
    setReleasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          escrowPaymentId: escrowPayment.id,
          releaseType: 'manual'
        }
      });

      if (error) throw error;

      toast({
        title: "Pagamento liberado!",
        description: "O pagamento foi liberado para o prestador.",
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao liberar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível liberar o pagamento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setReleasing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'held':
        return <Badge className="bg-blue-100 text-blue-800"><Shield className="w-3 h-3 mr-1" />Em Garantia</Badge>;
      case 'released':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Liberado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgressPercentage = () => {
    if (escrowPayment.status !== 'held') return 100;
    
    const releaseDate = new Date(escrowPayment.release_date);
    const createdDate = new Date(escrowPayment.created_at);
    const now = new Date();
    
    const totalTime = releaseDate.getTime() - createdDate.getTime();
    const elapsedTime = now.getTime() - createdDate.getTime();
    
    return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {formatCurrency(escrowPayment.amount)}
          </CardTitle>
          {getStatusBadge(escrowPayment.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valores */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Valor do Serviço</p>
            <p className="font-medium">{formatCurrency(escrowPayment.amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Taxa da Plataforma</p>
            <p className="font-medium">{formatCurrency(escrowPayment.platform_fee)}</p>
          </div>
        </div>

        {/* Status específico para cada tipo */}
        {escrowPayment.status === 'held' && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Liberação automática em:</span>
                <span className="font-medium">
                  {daysLeft > 0 ? `${daysLeft} dias` : `${hoursLeft}h restantes`}
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Pagamento em Garantia</p>
                  <p className="text-blue-700 mt-1">
                    {isClient 
                      ? 'O dinheiro será liberado automaticamente em 5 dias ou quando você marcar como concluído.'
                      : 'O cliente tem 5 dias para avaliar o trabalho. Após isso, o pagamento será liberado automaticamente.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de liberação para cliente */}
            {isClient && (
              <div className="pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      variant={canRelease ? "default" : "outline"}
                      disabled={!canRelease}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      {canRelease ? 'Liberar Pagamento' : 'Aguardar Conclusão'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Liberação de Pagamento</DialogTitle>
                      <DialogDescription>
                        Você está prestes a liberar {formatCurrency(escrowPayment.amount)} para o prestador.
                        Esta ação não pode ser desfeita.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-800">Atenção</p>
                            <p className="text-amber-700 mt-1">
                              Ao liberar o pagamento, você confirma que o trabalho foi concluído satisfatoriamente.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleReleasePayment}
                          disabled={releasing}
                          className="flex-1"
                        >
                          {releasing ? 'Liberando...' : 'Confirmar Liberação'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </>
        )}

        {escrowPayment.status === 'released' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Pagamento Liberado</p>
                <p className="text-green-700">
                  Concluído em {formatDate(escrowPayment.completed_at || escrowPayment.created_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informações de data */}
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          Criado em {formatDate(escrowPayment.created_at)}
        </div>
      </CardContent>
    </Card>
  );
}