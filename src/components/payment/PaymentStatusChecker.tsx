import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentStatusCheckerProps {
  externalPaymentId: string;
  onPaymentConfirmed: () => void;
}

export function PaymentStatusChecker({ externalPaymentId, onPaymentConfirmed }: PaymentStatusCheckerProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [lastStatus, setLastStatus] = useState<string>('');

  useEffect(() => {
    if (!externalPaymentId) return;

    let checkCount = 0;
    const maxChecks = 120; // 10 minutos com checks a cada 5 segundos

    const checkPaymentStatus = async () => {
      checkCount++;
      
      try {
        setChecking(true);
        console.log(`[PaymentChecker] Check #${checkCount} for payment: ${externalPaymentId}`);

        // Strategy 1: Call edge function to verify with AbacatePay and process
        try {
          const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-abacatepay-payment', {
            body: { paymentId: externalPaymentId }
          });

          console.log(`[PaymentChecker] Edge function response:`, { checkResult, checkError });
          
          if (!checkError && checkResult?.isPaid) {
            console.log(`[PaymentChecker] Payment confirmed by AbacatePay!`);
            
            toast({
              title: "Pagamento Confirmado!",
              description: "Seu pagamento foi confirmado e o contrato está sendo gerado automaticamente.",
            });
            
            // Wait a moment for processing then notify
            setTimeout(() => {
              onPaymentConfirmed();
            }, 2000);
            return true; // Payment confirmed, stop checking
          }
        } catch (checkFunctionError) {
          console.error(`[PaymentChecker] Error calling edge function:`, checkFunctionError);
        }

        // Strategy 2: Check database directly for status changes
        const { data: escrowPayments, error } = await supabase
          .from('escrow_payments')
          .select('id, status, job_id, amount')
          .eq('external_payment_id', externalPaymentId)
          .limit(1);

        if (error) {
          console.error(`[PaymentChecker] Database error:`, error);
        } else if (escrowPayments && escrowPayments.length > 0) {
          const payment = escrowPayments[0];
          console.log(`[PaymentChecker] Database payment status: ${payment.status}`);
          
          if (payment.status !== lastStatus) {
            setLastStatus(payment.status);
            
            if (payment.status === 'held') {
              console.log(`[PaymentChecker] Payment status changed to held!`);
              
              toast({
                title: "Pagamento Confirmado!",
                description: "Seu pagamento foi confirmado e está protegido em garantia. O trabalho está em andamento.",
              });
              
              // Check if contract exists, if not create one
              const { data: contracts } = await supabase
                .from('contracts')
                .select('id')
                .eq('job_id', payment.job_id)
                .limit(1);

              if (!contracts || contracts.length === 0) {
                console.log(`[PaymentChecker] No contract found, triggering contract creation`);
                
                // Try to trigger contract creation
                try {
                  await supabase.functions.invoke('check-abacatepay-payment', {
                    body: { paymentId: externalPaymentId }
                  });
                } catch (e) {
                  console.error(`[PaymentChecker] Error triggering contract creation:`, e);
                }
              }
              
              setTimeout(() => {
                onPaymentConfirmed();
              }, 1000);
              return true; // Payment confirmed, stop checking
            }
          }
        }

        // Strategy 3: Force processing if we've been checking for a while
        if (checkCount > 6 && checkCount % 6 === 0) { // Every 30 seconds after first minute
          console.log(`[PaymentChecker] Forcing payment fallback processing...`);
          try {
            await supabase.functions.invoke('sync-pending-payments');
          } catch (e) {
            console.error(`[PaymentChecker] Error calling sync:`, e);
          }
        }

        return false; // Continue checking
      } catch (error) {
        console.error(`[PaymentChecker] Unexpected error:`, error);
        return false;
      } finally {
        setChecking(false);
      }
    };

    // Check immediately
    checkPaymentStatus().then(shouldStop => {
      if (shouldStop) return;

      // Set up aggressive interval checking
      const interval = setInterval(async () => {
        if (checkCount >= maxChecks) {
          console.log(`[PaymentChecker] Max checks reached, stopping`);
          clearInterval(interval);
          return;
        }

        const shouldStop = await checkPaymentStatus();
        if (shouldStop) {
          clearInterval(interval);
        }
      }, 5000); // Check every 5 seconds

      return () => {
        clearInterval(interval);
      };
    });

  }, [externalPaymentId, lastStatus, onPaymentConfirmed, toast]);

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
        Verificando status do pagamento...
      </div>
    );
  }

  return null;
}