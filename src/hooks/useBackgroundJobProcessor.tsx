import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBackgroundJobProcessor = () => {
  const intervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  const processJobs = async () => {
    // Evitar múltiplas execuções simultâneas
    if (isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      console.log('Verificando jobs em background...');

      // Chamar a função que processa os jobs
      const { data, error } = await supabase.functions.invoke('process-background-jobs');

      if (error) {
        console.error('Erro ao processar jobs:', error);
        return;
      }

      if (data?.processed > 0) {
        console.log(`${data.processed} jobs processados com sucesso`);
      }
    } catch (error) {
      console.error('Erro no processamento automático:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const processPaymentFallbacks = async () => {
    try {
      console.log('Processando fallbacks de pagamento...');
      
      const { data, error } = await supabase.functions.invoke('process-payment-fallbacks');
      
      if (error) {
        console.error('Erro ao processar fallbacks:', error);
        return;
      }

      if (data?.processed > 0) {
        console.log(`${data.processed} pagamentos processados via fallback`);
      }
    } catch (error) {
      console.error('Erro no processamento de fallbacks:', error);
    }
  };

  useEffect(() => {
    // Processar jobs a cada 30 segundos
    intervalRef.current = setInterval(processJobs, 30000);
    
    // Processar fallbacks de pagamento a cada 60 segundos
    const fallbackInterval = setInterval(processPaymentFallbacks, 60000);

    // Processar jobs imediatamente na inicialização
    processJobs();
    
    // Processar fallbacks imediatamente
    setTimeout(processPaymentFallbacks, 5000); // Aguardar 5s para não sobrecarregar

    // Configurar listener para notificações de novos jobs
    const channel = supabase
      .channel('background-jobs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'background_jobs'
        },
        (payload) => {
          console.log('Novo job em background detectado:', payload);
          // Processar jobs imediatamente quando um novo for criado
          setTimeout(processJobs, 1000); // Aguardar 1 segundo para evitar condições de corrida
        }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    processJobs,
    processPaymentFallbacks
  };
};