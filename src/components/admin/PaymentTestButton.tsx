import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Zap, Loader2 } from 'lucide-react';

export const PaymentTestButton = () => {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const processPayment = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('force-process-payment', {
        body: {
          paymentId: 'pix_char_yRUSaZzpEPnmCHPYuhBAYuTy'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Pagamento Processado!",
          description: `${data.processed} pagamento(s) processado(s) com sucesso.`,
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o pagamento",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={processPayment}
        disabled={processing}
        className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
        size="sm"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Processar Pagamento Teste
          </>
        )}
      </Button>
    </div>
  );
};