import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function EscrowReleaseManager() {
  const [processing, setProcessing] = useState(false);
  const [lastRun, setLastRun] = useState<string>('');
  const { toast } = useToast();

  const triggerEscrowReleaseCheck = async () => {
    setProcessing(true);
    try {
      console.log('🚀 Triggering escrow release check...');
      
      const { data, error } = await supabase.functions.invoke('auto-release-escrow-cron', {
        body: { 
          triggered_by: 'admin_manual',
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast({
        title: "Processamento Concluído!",
        description: `${data.processed || 0} pagamentos processados. ${data.errors || 0} erros.`,
      });

      setLastRun(new Date().toLocaleString('pt-BR'));
    } catch (error) {
      console.error('Error triggering escrow release:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a liberação de escrows.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Gerenciar Liberação de Escrows
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Processamento Manual
            </span>
          </div>
          <Badge variant="outline" className="text-amber-700">
            Admin Only
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Esta função processa automaticamente todos os pagamentos em escrow que passaram da data de liberação (5 dias após conclusão).
        </p>

        {lastRun && (
          <div className="text-xs text-muted-foreground">
            Última execução: {lastRun}
          </div>
        )}

        <Button
          onClick={triggerEscrowReleaseCheck}
          disabled={processing}
          className="w-full"
          variant="outline"
        >
          {processing ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-spin" />
              Processando Liberações...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Executar Liberação Automática
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Verifica pagamentos com status 'held' e data de liberação vencida</p>
          <p>• Aplica taxa de 5% para usuários premium, 7.5% para padrão</p>
          <p>• Atualiza status do job para 'completed'</p>
          <p>• Envia notificações para cliente e prestador</p>
        </div>
      </CardContent>
    </Card>
  );
}