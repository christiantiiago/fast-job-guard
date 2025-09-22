import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Zap, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EscrowReleaseTimerProps {
  escrowPaymentId: string;
  releaseDate: string;
  onReleaseComplete?: () => void;
}

export function EscrowReleaseTimer({ 
  escrowPaymentId, 
  releaseDate,
  onReleaseComplete 
}: EscrowReleaseTimerProps) {
  const [triggeringRelease, setTriggeringRelease] = useState(false);
  const [canTrigger, setCanTrigger] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkIfCanTrigger = () => {
      const releaseDateTime = new Date(releaseDate);
      const now = new Date();
      setCanTrigger(now >= releaseDateTime);
    };

    checkIfCanTrigger();
    const interval = setInterval(checkIfCanTrigger, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [releaseDate]);

  const triggerAutomaticRelease = async () => {
    if (!canTrigger) return;

    setTriggeringRelease(true);
    try {
      console.log('🚀 Triggering automatic escrow release...');
      
      const { data, error } = await supabase.functions.invoke('auto-release-escrow-cron', {
        body: { 
          triggered_by: 'manual',
          specific_payment: escrowPaymentId 
        }
      });

      if (error) throw error;

      toast({
        title: "Liberação Processada!",
        description: "O processo de liberação automática foi executado com sucesso.",
      });

      onReleaseComplete?.();
    } catch (error) {
      console.error('Error triggering automatic release:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a liberação automática.",
        variant: "destructive",
      });
    } finally {
      setTriggeringRelease(false);
    }
  };

  if (!canTrigger) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Liberação automática disponível
            </span>
          </div>
          <Button
            onClick={triggerAutomaticRelease}
            disabled={triggeringRelease}
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {triggeringRelease ? (
              <>
                <Zap className="h-3 w-3 mr-1 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Processar Agora
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-amber-700 mt-2">
          O prazo de 5 dias foi atingido. Clique para processar a liberação automática.
        </p>
      </CardContent>
    </Card>
  );
}