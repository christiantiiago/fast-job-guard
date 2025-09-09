import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface FeeRule {
  id: string;
  name: string;
  client_fee_standard: number;
  client_fee_premium: number;
  provider_fee_standard: number;
  provider_fee_premium: number;
  is_active: boolean;
}

interface FeeCalculation {
  subtotal: number;
  platformFee: number;
  processingFee: number;
  total: number;
  feePercentage: number;
}

export const useFeeRules = () => {
  const { userRole, user } = useAuth();
  const [feeRules, setFeeRules] = useState<FeeRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // Check if user has premium subscription
  const checkPremiumStatus = async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error checking premium status:', error);
        return false;
      }

      const isPremium = data?.plan_name?.toLowerCase().includes('premium') || false;
      setIsPremiumUser(isPremium);
      return isPremium;
    } catch (error) {
      console.error('Error in checkPremiumStatus:', error);
      return false;
    }
  };

  // Fetch active fee rules
  const fetchFeeRules = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching fee rules:', error);
        return;
      }

      if (data) {
        setFeeRules(data);
      }
      
      await checkPremiumStatus();
    } catch (error) {
      console.error('Error in fetchFeeRules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate fees based on amount
  const calculateFees = (amount: number, forceStandard: boolean = false): FeeCalculation => {
    if (!feeRules || !amount) {
      return {
        subtotal: amount,
        platformFee: 0,
        processingFee: 0,
        total: amount,
        feePercentage: 0
      };
    }

    const isPremium = !forceStandard && isPremiumUser;
    let feePercentage = 0;
    
    if (userRole === 'client') {
      feePercentage = isPremium ? feeRules.client_fee_premium : feeRules.client_fee_standard;
      // For clients, add platform fee to the amount they pay
      const platformFee = (amount * feePercentage) / 100;
      const processingFee = amount * 0.029 + 0.39; // Stripe fee (2.9% + R$0.39)
      const total = amount + platformFee + processingFee;

      return {
        subtotal: amount,
        platformFee,
        processingFee,
        total,
        feePercentage
      };
    } else if (userRole === 'provider') {
      feePercentage = isPremium ? feeRules.provider_fee_premium : feeRules.provider_fee_standard;
      // For providers, deduct platform fee from the amount they receive
      const platformFee = (amount * feePercentage) / 100;
      const netAmount = amount - platformFee; // Provider receives less due to platform fee

      return {
        subtotal: amount, // Original job amount
        platformFee,
        processingFee: 0, // Providers don't pay processing fees
        total: netAmount, // What provider actually receives
        feePercentage
      };
    }

    // Fallback for other roles
    return {
      subtotal: amount,
      platformFee: 0,
      processingFee: 0,
      total: amount,
      feePercentage: 0
    };
  };

  // Calculate fee range for budget display
  const calculateFeeRange = (minAmount: number, maxAmount: number, forceStandard: boolean = false) => {
    const minFees = calculateFees(minAmount, forceStandard);
    const maxFees = calculateFees(maxAmount, forceStandard);

    return {
      min: minFees,
      max: maxFees
    };
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Get fee description
  const getFeeDescription = (forceStandard: boolean = false) => {
    if (!feeRules) return '';
    
    const isPremium = !forceStandard && isPremiumUser;
    let feePercentage = 0;
    if (userRole === 'client') {
      feePercentage = isPremium ? feeRules.client_fee_premium : feeRules.client_fee_standard;
      const planType = isPremium ? 'Premium (5%)' : 'Padrão (7,5%)';
      return `Taxa da plataforma ${planType}: ${feePercentage}% (será adicionada ao valor final)`;
    } else if (userRole === 'provider') {
      feePercentage = isPremium ? feeRules.provider_fee_premium : feeRules.provider_fee_standard;
      const planType = isPremium ? 'Premium (5%)' : 'Padrão (7,5%)';
      return `Taxa da plataforma ${planType}: ${feePercentage}% (será descontada do valor que você recebe)`;
    }

    const planType = isPremium ? 'Premium (5%)' : 'Padrão (7,5%)';
    return `Taxa da plataforma ${planType}: ${feePercentage}%`;
  };

  useEffect(() => {
    fetchFeeRules();
  }, [user]);

  return {
    feeRules,
    loading,
    isPremiumUser,
    calculateFees,
    calculateFeeRange,
    formatCurrency,
    getFeeDescription,
    refetch: fetchFeeRules
  };
};