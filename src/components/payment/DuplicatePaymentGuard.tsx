import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';

interface DuplicatePaymentGuardProps {
  jobId: string;
  onCanProceed: (canProceed: boolean) => void;
  onExistingPayment?: (payment: any) => void;
}

export function DuplicatePaymentGuard({ jobId, onCanProceed, onExistingPayment }: DuplicatePaymentGuardProps) {
  const [loading, setLoading] = useState(true);
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [jobStatus, setJobStatus] = useState<string>('');

  useEffect(() => {
    checkExistingPayments();
  }, [jobId]);

  const checkExistingPayments = async () => {
    try {
      setLoading(true);

      // Check for existing escrow payments
      const { data: escrowPayments, error: escrowError } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('job_id', jobId)
        .in('status', ['pending', 'held'])
        .limit(1);

      if (escrowError) {
        console.error('Error checking escrow payments:', escrowError);
      }

      // Check job status
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (jobError) {
        console.error('Error checking job status:', jobError);
      }

      if (jobData) {
        setJobStatus(jobData.status);
      }

      if (escrowPayments && escrowPayments.length > 0) {
        const payment = escrowPayments[0];
        setExistingPayment(payment);
        onCanProceed(false);
        onExistingPayment?.(payment);
      } else if (jobData?.status === 'in_progress' || jobData?.status === 'completed') {
        // Job is already in progress or completed
        onCanProceed(false);
      } else {
        // No existing payment and job is not started
        setExistingPayment(null);
        onCanProceed(true);
      }
    } catch (error) {
      console.error('Error in checkExistingPayments:', error);
      onCanProceed(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando Pagamento
          </Badge>
        );
      case 'held':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <Shield className="h-3 w-3 mr-1" />
            Pagamento em Garantia
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Em Andamento
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        <span className="ml-2 text-sm text-muted-foreground">Verificando pagamentos...</span>
      </div>
    );
  }

  if (existingPayment) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 mb-2">
                Pagamento já existe para este trabalho
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700">Status:</span>
                  {getStatusBadge(existingPayment.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700">Valor:</span>
                  <span className="font-medium">
                    R$ {existingPayment.total_amount?.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {existingPayment.release_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-700">Liberação automática:</span>
                    <span className="text-sm">
                      {new Date(existingPayment.release_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-yellow-600 mt-3">
                {existingPayment.status === 'pending' 
                  ? 'O pagamento está sendo processado. Aguarde a confirmação.'
                  : 'O pagamento foi confirmado e está protegido em garantia.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobStatus === 'in_progress' || jobStatus === 'completed') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800 mb-2">
                {jobStatus === 'completed' ? 'Trabalho Concluído' : 'Trabalho em Andamento'}
              </h3>
              <p className="text-sm text-green-700">
                {jobStatus === 'completed' 
                  ? 'Este trabalho já foi concluído.'
                  : 'Este trabalho já está em andamento com um prestador.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no existing payment and job is not started, return null (allow to proceed)
  return null;
}