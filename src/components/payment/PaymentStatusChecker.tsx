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

    const checkPaymentStatus = async () => {
      try {
        setChecking(true);

        // Check if escrow payment status changed
        const { data: escrowPayments, error } = await supabase
          .from('escrow_payments')
          .select('status, job_id')
          .eq('external_payment_id', externalPaymentId)
          .limit(1);

        if (error) {
          console.error('Error checking payment status:', error);
          return;
        }

        if (escrowPayments && escrowPayments.length > 0) {
          const payment = escrowPayments[0];
          
          if (payment.status !== lastStatus) {
            setLastStatus(payment.status);
            
            if (payment.status === 'held') {
              toast({
                title: "Pagamento Confirmado!",
                description: "Seu pagamento foi confirmado e está protegido em garantia. O trabalho está em andamento.",
              });
              
              // Notify parent component
              onPaymentConfirmed();
              
              // Stop checking since payment is confirmed
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error in payment status check:', error);
      } finally {
        setChecking(false);
      }
    };

    // Check immediately
    checkPaymentStatus();

    // Set up interval to check every 15 seconds
    const interval = setInterval(checkPaymentStatus, 15000);

    // Stop checking after 10 minutes (40 checks)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
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