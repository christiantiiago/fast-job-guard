import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PremiumStatus {
  is_premium: boolean;
  plan: string;
  status: string;
  subscription?: {
    id: string;
    status: string;
    current_period_end: string;
    plan_amount: number;
    cancel_at_period_end: boolean;
  };
}

export const usePremiumStatus = () => {
  const { user } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    is_premium: false,
    plan: 'free',
    status: 'inactive'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPremiumStatus = async () => {
    if (!user) {
      setPremiumStatus({
        is_premium: false,
        plan: 'free',
        status: 'inactive'
      });
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: functionError } = await supabase.functions.invoke('check-premium-status');
      
      if (functionError) throw functionError;
      
      setPremiumStatus(data);
      console.log('[PREMIUM-HOOK] Status updated:', data);
    } catch (err) {
      console.error('[PREMIUM-HOOK] Error checking premium status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPremiumStatus({
        is_premium: false,
        plan: 'free',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPremiumStatus();
  }, [user]);

  return {
    premiumStatus,
    loading,
    error,
    refetch: checkPremiumStatus,
    isPremium: premiumStatus.is_premium
  };
};