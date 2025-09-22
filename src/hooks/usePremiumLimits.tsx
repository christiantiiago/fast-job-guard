import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { usePremiumStatus } from './usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';

interface LimitsData {
  monthlyProposals: number;
  maxProposals: number;
  freeWithdrawals: number;
  maxFreeWithdrawals: number;
  platformFee: number;
  hasUnlimitedProposals: boolean;
  hasHighlight: boolean;
  canSetGoals: boolean;
}

export const usePremiumLimits = () => {
  const { user } = useAuth();
  const { premiumStatus, isPremium } = usePremiumStatus();
  const [limits, setLimits] = useState<LimitsData>({
    monthlyProposals: 0,
    maxProposals: 10,
    freeWithdrawals: 0,
    maxFreeWithdrawals: 1,
    platformFee: 7.5,
    hasUnlimitedProposals: false,
    hasHighlight: false,
    canSetGoals: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      calculateLimits();
    }
  }, [user, isPremium]);

  const calculateLimits = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar propostas do mês atual
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data: monthlyProposals } = await supabase
        .from('proposals')
        .select('id')
        .eq('provider_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      // Buscar saques gratuitos do mês atual
      const { data: monthlyWithdrawals } = await supabase
        .from('payouts')
        .select('id')
        .eq('provider_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .is('external_payout_id', null); // Saques gratuitos não têm taxa

      const proposalCount = monthlyProposals?.length || 0;
      const withdrawalCount = monthlyWithdrawals?.length || 0;

      if (isPremium) {
        // Limites premium
        setLimits({
          monthlyProposals: proposalCount,
          maxProposals: -1, // Ilimitado
          freeWithdrawals: withdrawalCount,
          maxFreeWithdrawals: 3,
          platformFee: 5.0,
          hasUnlimitedProposals: true,
          hasHighlight: true,
          canSetGoals: true
        });
      } else {
        // Limites gratuitos
        setLimits({
          monthlyProposals: proposalCount,
          maxProposals: 10,
          freeWithdrawals: withdrawalCount,
          maxFreeWithdrawals: 1,
          platformFee: 7.5,
          hasUnlimitedProposals: false,
          hasHighlight: false,
          canSetGoals: false
        });
      }
    } catch (error) {
      console.error('Error calculating limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const canMakeProposal = () => {
    if (limits.hasUnlimitedProposals) return true;
    return limits.monthlyProposals < limits.maxProposals;
  };

  const canMakeFreeWithdrawal = () => {
    return limits.freeWithdrawals < limits.maxFreeWithdrawals;
  };

  const getRemainingProposals = () => {
    if (limits.hasUnlimitedProposals) return -1;
    return Math.max(0, limits.maxProposals - limits.monthlyProposals);
  };

  const getRemainingWithdrawals = () => {
    return Math.max(0, limits.maxFreeWithdrawals - limits.freeWithdrawals);
  };

  const getProposalLimitMessage = () => {
    if (limits.hasUnlimitedProposals) {
      return 'Propostas ilimitadas (Premium)';
    }
    
    const remaining = getRemainingProposals();
    if (remaining === 0) {
      return 'Limite de propostas atingido este mês. Upgrade para Premium para propostas ilimitadas!';
    }
    
    return `${remaining} propostas restantes este mês`;
  };

  const getWithdrawalLimitMessage = () => {
    const remaining = getRemainingWithdrawals();
    if (remaining === 0) {
      return isPremium 
        ? 'Você usou todos os 3 saques gratuitos deste mês'
        : 'Você usou seu saque gratuito deste mês. Próximo saque custará R$ 7,50';
    }
    
    return `${remaining} saque${remaining > 1 ? 's' : ''} gratuito${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} este mês`;
  };

  return {
    limits,
    loading,
    canMakeProposal,
    canMakeFreeWithdrawal,
    getRemainingProposals,
    getRemainingWithdrawals,
    getProposalLimitMessage,
    getWithdrawalLimitMessage,
    refetch: calculateLimits
  };
};