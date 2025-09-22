import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Zap, Settings, CheckCircle } from 'lucide-react';

interface PendingPayment {
  id: string;
  external_payment_id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title?: string;
}

export function PaymentDebugPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          external_payment_id,
          amount,
          status,
          created_at,
          job_id
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get job titles separately
      const jobIds = data.map(p => p.job_id).filter(Boolean);
      let jobTitles: Record<string, string> = {};
      
      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, title')
          .in('id', jobIds);
        
        jobTitles = (jobsData || []).reduce((acc, job) => {
          acc[job.id] = job.title;
          return acc;
        }, {} as Record<string, string>);
      }

      const formatted = data.map(p => ({
        id: p.id,
        external_payment_id: p.external_payment_id,
        amount: p.amount,
        status: p.status,
        created_at: p.created_at,
        job_title: jobTitles[p.job_id] || 'Job sem título'
      }));

      setPendingPayments(formatted);
    } catch (error) {
      console.error('[Debug] Error fetching pending payments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar pagamentos pendentes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const forceSyncAll = async () => {
    try {
      setLoading(true);
      console.log('[Debug] Forçando sincronização de todos os pagamentos...');

      const { data, error } = await supabase.functions.invoke('sync-pending-payments');

      if (error) {
        console.error('[Debug] Erro na sincronização:', error);
        throw error;
      }

      console.log('[Debug] Resultado:', data);

      toast({
        title: "Sincronização Executada",
        description: `${data?.processed || 0} pagamentos processados.`,
      });

      // Atualizar lista
      setTimeout(fetchPendingPayments, 2000);

    } catch (error) {
      console.error('[Debug] Erro na sincronização:', error);
      toast({
        title: "Erro na Sincronização",
        description: "Falha ao executar sincronização.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processSpecificPayment = async (paymentId: string) => {
    try {
      setLoading(true);
      console.log(`[Debug] Processando pagamento específico: ${paymentId}`);

      const { data, error } = await supabase.functions.invoke('check-abacatepay-payment', {
        body: { paymentId }
      });

      if (error) {
        console.error('[Debug] Erro no processamento:', error);
        throw error;
      }

      console.log('[Debug] Resultado do processamento:', data);

      toast({
        title: data?.isPaid ? "Pagamento Confirmado" : "Pagamento Pendente",
        description: data?.message || "Processamento executado.",
      });

      // Atualizar lista
      setTimeout(fetchPendingPayments, 2000);

    } catch (error) {
      console.error('[Debug] Erro no processamento:', error);
      toast({
        title: "Erro no Processamento",
        description: "Falha ao processar pagamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setShowPanel(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-96">
      <Card className="bg-background/95 backdrop-blur-sm border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Debug: Pagamentos</CardTitle>
            <Button
              onClick={() => setShowPanel(false)}
              variant="ghost"
              size="sm"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={fetchPendingPayments}
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Listar
            </Button>
            <Button
              onClick={forceSyncAll}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <Zap className="w-4 h-4 mr-2" />
              Sync All
            </Button>
          </div>

          {pendingPayments.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="text-sm font-medium">
                Pagamentos Pendentes ({pendingPayments.length})
              </div>
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="p-2 border rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{payment.job_title || 'Job'}</div>
                    <Badge variant="outline" className="text-xs">
                      R$ {payment.amount}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    ID: {payment.external_payment_id || 'N/A'}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(payment.created_at).toLocaleString('pt-BR')}
                  </div>
                  <Button
                    onClick={() => processSpecificPayment(payment.external_payment_id)}
                    disabled={loading || !payment.external_payment_id}
                    size="sm"
                    className="w-full h-6 text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Processar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {pendingPayments.length === 0 && !loading && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Nenhum pagamento pendente encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}