import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DuplicatePaymentGuardProps {
  jobId: string;
  onCanProceed: (canProceed: boolean) => void;
  onExistingPayment?: (paymentData: any) => void;
}

export function DuplicatePaymentGuard({ 
  jobId, 
  onCanProceed, 
  onExistingPayment 
}: DuplicatePaymentGuardProps) {
  const [loading, setLoading] = useState(true);
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [jobStatus, setJobStatus] = useState<string>('');

  useEffect(() => {
    checkExistingPayments();
  }, [jobId]);

  const checkExistingPayments = async () => {
    try {
      setLoading(true);

      // Check for existing escrow payments for this job
      const { data: escrowPayments, error: escrowError } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('job_id', jobId)
        .in('status', ['pending', 'held'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (escrowError) throw escrowError;

      // Check job status
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('status, provider_id')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      setJobStatus(jobData.status);

      if (escrowPayments && escrowPayments.length > 0) {
        const payment = escrowPayments[0];
        setExistingPayment(payment);
        onCanProceed(false);
        onExistingPayment?.(payment);
      } else if (jobData.status === 'in_progress' || jobData.status === 'completed') {
        // Job is already in progress or completed
        onCanProceed(false);
      } else {
        // No existing payments, can proceed
        onCanProceed(true);
      }
    } catch (error) {
      console.error('Error checking existing payments:', error);
      onCanProceed(true); // Allow proceeding on error to avoid blocking
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando Pagamento
          </Badge>
        );
      case 'held':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Shield className="h-3 w-3 mr-1" />
            Em Garantia
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Em Andamento
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Verificando pagamentos...</span>
      </div>
    );
  }

  if (existingPayment) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-3">
            <div>
              <strong>Pagamento já existe para este trabalho</strong>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Status atual:</span>
              {getStatusBadge(existingPayment.status)}
            </div>

            <div className="text-sm space-y-1">
              <p><strong>Valor:</strong> R$ {existingPayment.amount.toFixed(2)}</p>
              <p><strong>Criado em:</strong> {new Date(existingPayment.created_at).toLocaleString('pt-BR')}</p>
              {existingPayment.external_payment_id && (
                <p><strong>ID do Pagamento:</strong> {existingPayment.external_payment_id}</p>
              )}
            </div>

            {existingPayment.status === 'pending' && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Aguardando confirmação:</strong> O pagamento foi iniciado mas ainda não foi confirmado. 
                  Complete o pagamento através do QR Code ou PIX Copia e Cola que você recebeu.
                </p>
              </div>
            )}

            {existingPayment.status === 'held' && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Pagamento confirmado:</strong> O valor está protegido em garantia e o trabalho já está em andamento.
                </p>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkExistingPayments}
              className="w-full"
            >
              Verificar Novamente
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (jobStatus === 'in_progress' || jobStatus === 'completed') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="space-y-2">
            <p><strong>Trabalho já está em andamento</strong></p>
            <p className="text-sm">
              Este trabalho já foi pago e está sendo executado. Não é possível fazer um novo pagamento.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">Status:</span>
              {getStatusBadge(jobStatus)}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}