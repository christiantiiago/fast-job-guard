import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useContractSync = () => {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  const syncPendingPayments = async () => {
    if (isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      console.log('[ContractSync] Syncing pending payments...');

      const { data, error } = await supabase.functions.invoke('sync-pending-payments');

      if (error) {
        console.error('[ContractSync] Error syncing:', error);
        return;
      }

      if (data?.processed > 0) {
        console.log(`[ContractSync] ${data.processed} payments processed`);
        toast({
          title: "Pagamentos Sincronizados",
          description: `${data.processed} pagamento(s) foram processados e contratos gerados.`,
        });
      }
    } catch (error) {
      console.error('[ContractSync] Unexpected error:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const checkEscrowPayments = async () => {
    try {
      console.log('[ContractSync] Checking for held escrow payments without contracts...');

      // Find escrow payments that are held but don't have contracts
      const { data: escrowPayments, error } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          job_id,
          client_id,
          provider_id,
          amount,
          external_payment_id
        `)
        .eq('status', 'held')
        .limit(20);

      if (error || !escrowPayments) {
        console.error('[ContractSync] Error fetching escrow payments:', error);
        return;
      }

      for (const escrow of escrowPayments) {
        // Check if contract exists for this job
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id')
          .eq('job_id', escrow.job_id)
          .limit(1);

        if (!contracts || contracts.length === 0) {
          console.log(`[ContractSync] Missing contract for job ${escrow.job_id}, triggering creation`);
          
          // Try to re-process this payment to create the contract
          if (escrow.external_payment_id) {
            try {
              await fetch(`https://yelytezcifyrykxvlbok.supabase.co/functions/v1/check-abacatepay-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbHl0ZXpjaWZ5cnlreHZsYm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODEwMTEsImV4cCI6MjA3MjM1NzAxMX0.GoB7I_naVGsVIhZgAaQoQBjTJijJZ-sbEATYZlbAw-k'
                },
                body: JSON.stringify({ paymentId: escrow.external_payment_id })
              });
            } catch (e) {
              console.error(`[ContractSync] Error re-processing payment:`, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('[ContractSync] Error checking escrow payments:', error);
    }
  };

  useEffect(() => {
    // Sync immediately on mount
    syncPendingPayments();
    checkEscrowPayments();

    // Set up intervals
    const syncInterval = setInterval(syncPendingPayments, 60000); // Every minute
    const contractCheckInterval = setInterval(checkEscrowPayments, 120000); // Every 2 minutes

    // Listen to real-time changes in escrow_payments
    const channel = supabase
      .channel('escrow-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'escrow_payments'
        },
        (payload) => {
          console.log('[ContractSync] Escrow payment updated:', payload);
          if (payload.new?.status === 'held') {
            // Check if contract exists for this payment
            setTimeout(checkEscrowPayments, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(syncInterval);
      clearInterval(contractCheckInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    syncPendingPayments,
    checkEscrowPayments
  };
};