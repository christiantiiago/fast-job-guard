import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawalSettings {
  enabled: boolean;
  minimumAmount: number;
  dayOfWeek: number; // 4 = Thursday
  lastProcessed?: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  type: 'instant' | 'scheduled';
  fee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  pix_key?: string;
  external_id?: string;
}

export const useAdvancedWithdrawals = () => {
  const { user } = useAuth();
  const [autoWithdrawal, setAutoWithdrawal] = useState<WithdrawalSettings>({
    enabled: false,
    minimumAmount: 50,
    dayOfWeek: 4 // Thursday
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawalSettings = async () => {
    if (!user) return;

    try {
      // Buscar configurações de saque automático do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // Assumir configurações padrão por enquanto
        setAutoWithdrawal({
          enabled: false,
          minimumAmount: 50,
          dayOfWeek: 4
        });
      }
    } catch (error) {
      console.error('Error fetching withdrawal settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedHistory: WithdrawalRequest[] = (data || []).map(payout => ({
        id: payout.id,
        amount: payout.amount,
        type: 'scheduled', // Por enquanto todos são programados
        fee: 0, // Fee será calculado baseado no tipo
        status: payout.status as 'pending' | 'processing' | 'completed' | 'failed',
        created_at: payout.created_at,
        processed_at: payout.processed_at,
        external_id: payout.external_payout_id
      }));

      setWithdrawalHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
    }
  };

  const updateAutoWithdrawal = async (settings: Partial<WithdrawalSettings>) => {
    if (!user) return;

    try {
      const newSettings = { ...autoWithdrawal, ...settings };
      setAutoWithdrawal(newSettings);

      // Aqui salvaria as configurações no banco
      // Por enquanto apenas atualiza o estado local
      console.log('Auto withdrawal settings updated:', newSettings);
    } catch (error) {
      console.error('Error updating auto withdrawal settings:', error);
    }
  };

  const requestInstantWithdrawal = async (
    amount: number, 
    pixKey: string,
    requiresFacialAuth: boolean = false
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Calcular taxa de saque imediato
      const fee = 7.50;
      const netAmount = amount - fee;

      if (netAmount <= 0) {
        throw new Error('Valor insuficiente para cobrir a taxa de R$ 7,50');
      }

      // Criar solicitação de saque
      const { data, error } = await supabase
        .from('payouts')
        .insert({
          provider_id: user.id,
          amount: netAmount,
          status: 'pending',
          provider: 'mercadopago',
          bank_details: {
            type: 'pix',
            key: pixKey,
            fee_charged: fee,
            original_amount: amount,
            withdrawal_type: 'instant'
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar histórico
      await fetchWithdrawalHistory();

      return {
        id: data.id,
        amount: netAmount,
        fee,
        status: 'pending' as const
      };
    } catch (error) {
      console.error('Error requesting instant withdrawal:', error);
      throw error;
    }
  };

  const getNextScheduledWithdrawal = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    const nextThursday = new Date(now);
    nextThursday.setDate(now.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
    
    return nextThursday;
  };

  const calculateWithdrawalFee = (amount: number, type: 'instant' | 'scheduled') => {
    if (type === 'instant') {
      return 7.50; // Taxa fixa para PIX imediato
    }
    return 0; // Saque programado é gratuito
  };

  useEffect(() => {
    if (user) {
      fetchWithdrawalSettings();
      fetchWithdrawalHistory();
    }
  }, [user]);

  return {
    autoWithdrawal,
    withdrawalHistory,
    loading,
    updateAutoWithdrawal,
    requestInstantWithdrawal,
    getNextScheduledWithdrawal,
    calculateWithdrawalFee,
    refetch: () => {
      fetchWithdrawalSettings();
      fetchWithdrawalHistory();
    }
  };
};