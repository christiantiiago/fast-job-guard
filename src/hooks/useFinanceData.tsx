import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PaymentData {
  id: string;
  amount: number;
  platform_fee?: number;
  total_amount?: number;
  status: string;
  type: string;
  created_at: string;
  job_title?: string;
  client_name?: string;
  provider_name?: string;
  job_id?: string;
  client_id?: string;
  provider_id?: string;
  payment_method?: string;
  release_date?: string;
  net_amount?: number;
  external_id?: string;
}

interface PayoutData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
  bank_details?: any;
}

interface FinanceStats {
  totalEarnings: number;
  totalExpenses: number;
  availableBalance: number;
  pendingBalance: number;
  pendingAmount: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  averageJobValue: number;
  totalFees: number;
  currentMonthEarnings: number;
  totalWithdrawn: number;
  totalTransactions: number;
  avgRating: number;
}

export const useFinanceData = () => {
  const { user, userRole } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    totalEarnings: 0,
    totalExpenses: 0,
    availableBalance: 0,
    pendingBalance: 0,
    pendingAmount: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    averageJobValue: 0,
    totalFees: 0,
    currentMonthEarnings: 0,
    totalWithdrawn: 0,
    totalTransactions: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      console.log('💰 Fetching escrow payments...');
      // Fetch escrow payments
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          amount,
          total_amount,
          platform_fee,
          status,
          release_date,
          created_at,
          completed_at,
          job_id,
          client_id,
          provider_id
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (escrowError) {
        console.error('Error fetching escrow payments:', escrowError);
        throw escrowError;
      }

      // Fetch job boosts
      console.log('🚀 Fetching job boosts...');
      const { data: boostData, error: boostError } = await supabase
        .from('job_boosts')
        .select(`
          id,
          amount,
          status,
          created_at,
          activated_at,
          job_id,
          user_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (boostError) {
        console.error('Error fetching job boosts:', boostError);
        throw boostError;
      }

      // Transform escrow data
      const escrowPayments: PaymentData[] = (escrowData || []).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        platform_fee: payment.platform_fee,
        total_amount: payment.total_amount,
        status: payment.status,
        type: userRole === 'provider' ? 'escrow_received' : 'escrow_paid',
        created_at: payment.created_at,
        job_id: payment.job_id,
        client_id: payment.client_id,
        provider_id: payment.provider_id,
        release_date: payment.release_date,
        net_amount: payment.amount - (payment.platform_fee || 0),
        payment_method: 'escrow',
        external_id: payment.id
      }));

      // Transform boost data
      const boostPayments: PaymentData[] = (boostData || []).map(boost => ({
        id: boost.id,
        amount: boost.amount,
        status: boost.status,
        type: 'job_boost',
        created_at: boost.created_at,
        job_id: boost.job_id
      }));

      const allPayments = [...escrowPayments, ...boostPayments];
      console.log(`📊 Loaded ${allPayments.length} payments (${escrowPayments.length} escrow + ${boostPayments.length} boosts)`);
      
      setPayments(allPayments);
    } catch (error) {
      console.error('Error in fetchPayments:', error);
    }
  };

  const fetchPayouts = async () => {
    if (!user || userRole !== 'provider') return;

    try {
      console.log('💸 Fetching payouts...');
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching payouts:', error);
        throw error;
      }

      console.log(`📋 Loaded ${(data || []).length} payouts`);
      setPayouts(data || []);
    } catch (error) {
      console.error('Error in fetchPayouts:', error);
    }
  };

  const calculateStats = (paymentsData: PaymentData[], payoutsData: PayoutData[]) => {
    console.log('📈 Calculating stats...');
    
    if (userRole === 'provider') {
      // Provider stats
      const receivedPayments = paymentsData.filter(p => 
        p.type === 'escrow_received' && p.status === 'released'
      );
      const paidBoosts = paymentsData.filter(p => 
        p.type === 'job_boost' && (p.status === 'completed' || p.status === 'active')
      );
      const pendingPayments = paymentsData.filter(p => 
        p.type === 'escrow_received' && p.status === 'held'
      );

      const totalEarnings = receivedPayments.reduce((sum, p) => 
        sum + (p.amount - (p.platform_fee || 0)), 0
      );
      const totalExpenses = paidBoosts.reduce((sum, p) => sum + p.amount, 0);
      const pendingBalance = pendingPayments.reduce((sum, p) => 
        sum + (p.amount - (p.platform_fee || 0)), 0
      );
      const totalFees = receivedPayments.reduce((sum, p) => sum + (p.platform_fee || 0), 0);

      // Calculate current month earnings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthPayments = receivedPayments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });
      const currentMonthEarnings = currentMonthPayments.reduce((sum, p) => 
        sum + (p.amount - (p.platform_fee || 0)), 0
      );

      setStats({
        totalEarnings,
        totalExpenses,
        availableBalance: totalEarnings - totalExpenses,
        pendingBalance,
        pendingAmount: pendingBalance,
        totalJobs: receivedPayments.length + pendingPayments.length,
        completedJobs: receivedPayments.length,
        pendingJobs: pendingPayments.length,
        averageJobValue: receivedPayments.length > 0 ? totalEarnings / receivedPayments.length : 0,
        totalFees,
        currentMonthEarnings,
        totalWithdrawn: 0, // Would need to calculate from payouts
        totalTransactions: receivedPayments.length + pendingPayments.length + paidBoosts.length,
        avgRating: 0 // Would need to fetch from profile
      });
    } else {
      // Client stats
      const paidPayments = paymentsData.filter(p => 
        p.type === 'escrow_paid' && ['held', 'released'].includes(p.status)
      );
      const paidBoosts = paymentsData.filter(p => 
        p.type === 'job_boost' && (p.status === 'completed' || p.status === 'active')
      );

      const totalExpenses = paidPayments.reduce((sum, p) => sum + (p.total_amount || p.amount), 0);
      const totalBoostExpenses = paidBoosts.reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalEarnings: 0,
        totalExpenses: totalExpenses + totalBoostExpenses,
        availableBalance: 0,
        pendingBalance: 0,
        pendingAmount: 0,
        totalJobs: paidPayments.length,
        completedJobs: paidPayments.filter(p => p.status === 'released').length,
        pendingJobs: paidPayments.filter(p => p.status === 'held').length,
        averageJobValue: paidPayments.length > 0 ? totalExpenses / paidPayments.length : 0,
        totalFees: 0,
        currentMonthEarnings: 0,
        totalWithdrawn: 0,
        totalTransactions: paidPayments.length + paidBoosts.length,
        avgRating: 0
      });
    }
  };

  const requestWithdrawal = async (amount: number, bankDetails: any) => {
    if (!user || userRole !== 'provider') {
      throw new Error('Only providers can request withdrawals');
    }

    try {
      const { data, error } = await supabase
        .from('payouts')
        .insert({
          provider_id: user.id,
          amount: amount,
          bank_details: bankDetails,
          provider: 'stripe' // Changed from 'manual_withdrawal' to valid enum value
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Withdrawal request created:', data.id);
      
      // Refresh data
      await fetchPayouts();
      
      return data;
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchPayments();
      await fetchPayouts();
      setLoading(false);
    };

    fetchData();
    
    // Setup realtime subscriptions
    if (!user) return;

    console.log('🔔 Setting up realtime subscriptions for finance data...');

    // Subscribe to escrow payment changes
    const escrowChannel = supabase
      .channel('escrow-payments-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrow_payments',
          filter: userRole === 'provider' 
            ? `provider_id=eq.${user.id}` 
            : `client_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💰 Escrow payment updated:', payload);
          fetchPayments(); // Refresh payments when escrow changes
        }
      )
      .subscribe();

    // Subscribe to job boost changes
    const boostChannel = supabase
      .channel('job-boosts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_boosts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🚀 Job boost updated:', payload);
          fetchPayments(); // Refresh payments when boost changes
        }
      )
      .subscribe();

    // Subscribe to payout changes (for providers)
    let payoutChannel = null;
    if (userRole === 'provider') {
      payoutChannel = supabase
        .channel('payouts-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payouts',
            filter: `provider_id=eq.${user.id}`
          },
          (payload) => {
            console.log('💸 Payout updated:', payload);
            fetchPayouts(); // Refresh payouts when changed
          }
        )
        .subscribe();
    }

    return () => {
      console.log('🔇 Cleaning up realtime subscriptions...');
      supabase.removeChannel(escrowChannel);
      supabase.removeChannel(boostChannel);
      if (payoutChannel) {
        supabase.removeChannel(payoutChannel);
      }
    };
  }, [user, userRole]);

  useEffect(() => {
    if (payments.length > 0 || payouts.length > 0) {
      calculateStats(payments, payouts);
    }
  }, [payments, payouts]);

  return {
    payments,
    payouts,
    stats,
    loading,
    requestWithdrawal,
    refetch: async () => {
      await fetchPayments();
      await fetchPayouts();
    }
  };
};