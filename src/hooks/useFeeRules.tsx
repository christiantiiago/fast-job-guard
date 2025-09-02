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
  const { userRole } = useAuth();
  const [feeRules, setFeeRules] = useState<FeeRule | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch active fee rules
  const fetchFeeRules = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_rules')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching fee rules:', error);
        return;
      }

      setFeeRules(data);
    } catch (error) {
      console.error('Error in fetchFeeRules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate fees based on amount
  const calculateFees = (amount: number, isPremium: boolean = false): FeeCalculation => {
    if (!feeRules || !amount) {
      return {
        subtotal: amount,
        platformFee: 0,
        processingFee: 0,
        total: amount,
        feePercentage: 0
      };
    }

    let feePercentage = 0;
    
    if (userRole === 'client') {
      feePercentage = isPremium ? feeRules.client_fee_premium : feeRules.client_fee_standard;
    } else if (userRole === 'provider') {
      feePercentage = isPremium ? feeRules.provider_fee_premium : feeRules.provider_fee_standard;
    }

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
  };

  // Calculate fee range for budget display
  const calculateFeeRange = (minAmount: number, maxAmount: number, isPremium: boolean = false) => {
    const minFees = calculateFees(minAmount, isPremium);
    const maxFees = calculateFees(maxAmount, isPremium);

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
  const getFeeDescription = (isPremium: boolean = false) => {
    if (!feeRules) return '';
    
    let feePercentage = 0;
    if (userRole === 'client') {
      feePercentage = isPremium ? feeRules.client_fee_premium : feeRules.client_fee_standard;
    } else if (userRole === 'provider') {
      feePercentage = isPremium ? feeRules.provider_fee_premium : feeRules.provider_fee_standard;
    }

    const planType = isPremium ? 'Premium' : 'Padrão';
    return `Taxa da plataforma ${planType}: ${feePercentage}%`;
  };

  useEffect(() => {
    fetchFeeRules();
  }, []);

  return {
    feeRules,
    loading,
    calculateFees,
    calculateFeeRange,
    formatCurrency,
    getFeeDescription,
    refetch: fetchFeeRules
  };
};