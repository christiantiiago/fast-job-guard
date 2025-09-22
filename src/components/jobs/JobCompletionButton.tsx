import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, Shield } from 'lucide-react';

interface JobCompletionButtonProps {
  jobId: string;
  jobTitle: string;
  onCompleted?: () => void;
  className?: string;
}

export function JobCompletionButton({ 
  jobId, 
  jobTitle, 
  onCompleted,
  className = "" 
}: JobCompletionButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { toast } = useToast();

  const handleCompleteJob = async () => {
    setCompleting(true);
    try {
      // Find and release the escrow payment for this job
      const { data: escrowPayments, error: escrowError } = await supabase
        .from('escrow_payments')
        .select('id')
        .eq('job_id', jobId)
        .eq('status', 'held')
        .limit(1);

      if (escrowError) throw escrowError;

      if (escrowPayments && escrowPayments.length > 0) {
        // Release the escrow payment
        const { error: releaseError } = await supabase.functions.invoke('release-escrow-payment', {
          body: {
            escrowPaymentId: escrowPayments[0].id,
            releaseType: 'manual'
          }
        });

        if (releaseError) throw releaseError;
      }

      // Update job status to completed
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (jobUpdateError) throw jobUpdateError;

      toast({
        title: "Trabalho Concluído!",
        description: "O pagamento foi liberado para o prestador com sucesso.",
      });

      setShowConfirmDialog(false);
      onCompleted?.();
    } catch (error) {
      console.error('Error completing job:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível concluir o trabalho.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        className={`bg-green-600 hover:bg-green-700 ${className}`}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Marcar como Concluído
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Concluir Trabalho
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Você está prestes a concluir:</strong></p>
                  <p className="text-sm font-medium">{jobTitle}</p>
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="space-y-2">
                  <p><strong>Atenção:</strong> Esta ação liberará o pagamento imediatamente para o prestador.</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>O valor em garantia será liberado</li>
                    <li>O trabalho será marcado como concluído</li>
                    <li>Esta ação não pode ser desfeita</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCompleteJob}
                disabled={completing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {completing ? 'Processando...' : 'Sim, Concluir Trabalho'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
                disabled={completing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}