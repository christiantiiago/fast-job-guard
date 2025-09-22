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
      // Update job status to waiting for client approval
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({ 
          status: 'waiting_approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (jobUpdateError) throw jobUpdateError;

      // Update escrow payment release date to 5 days from now
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 5);

      const { error: escrowUpdateError } = await supabase
        .from('escrow_payments')
        .update({ 
          release_date: releaseDate.toISOString()
        })
        .eq('job_id', jobId)
        .eq('status', 'held');

      if (escrowUpdateError) throw escrowUpdateError;

      // Notify client about job completion
      const { data: user } = await supabase.auth.getUser();
      const { error: notifyError } = await supabase
        .rpc('notify_job_completion', { 
          job_uuid: jobId, 
          provider_user_id: user?.user?.id 
        });

      if (notifyError) console.error('Error sending notification:', notifyError);

      toast({
        title: "Trabalho Marcado como Concluído!",
        description: "O cliente foi notificado e tem 5 dias para revisar. O pagamento será liberado automaticamente se não houver ação.",
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

            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <p><strong>Novo Fluxo:</strong> O cliente será notificado para aprovação.</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>O cliente tem 5 dias para revisar e liberar o pagamento</li>
                    <li>Se não houver ação, o pagamento será liberado automaticamente</li>
                    <li>O cliente pode liberar o pagamento imediatamente se estiver satisfeito</li>
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