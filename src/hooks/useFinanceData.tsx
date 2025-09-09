import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PaymentData {
  id: string;
  amount: number;
  net_amount: number;
  client_fee: number;
  provider_fee: number;
  platform_fee: number;
  status: string;
  job_title: string;
  job_id: string;
  created_at: string;
  processed_at: string;
}

interface PayoutData {
  id: string;
  amount: number;
  status: string;
  bank_details: any;
  created_at: string;
  processed_at: string;
}

interface FinanceStats {
  totalEarnings: number;
  availableBalance: number;
  pendingAmount: number;
  totalWithdrawn: number;
  totalJobs: number;
  currentMonthEarnings: number;
  avgRating: number;
}

export const useFinanceData = () => {
  const { user, userRole } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingAmount: 0,
    totalWithdrawn: 0,
    totalJobs: 0,
    currentMonthEarnings: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!user || userRole !== 'provider') return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          net_amount,
          client_fee,
          provider_fee,
          platform_fee,
          status,
          created_at,
          processed_at,
          job_id,
          jobs!inner(title)
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPayments = (data || []).map(payment => ({
        ...payment,
        job_title: payment.jobs?.title || 'Trabalho removido'
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchPayouts = async () => {
    if (!user || userRole !== 'provider') return;

    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  };

  const calculateStats = () => {
    if (!payments.length) return;

    const completedPayments = payments.filter(p => p.status === 'completed');
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'held');
    const totalWithdrawn = payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalEarnings = completedPayments.reduce((sum, p) => sum + p.net_amount, 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.net_amount, 0);
    const availableBalance = totalEarnings - totalWithdrawn;

    // Ganhos do mês atual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthEarnings = completedPayments
      .filter(p => {
        const paymentDate = new Date(p.processed_at || p.created_at);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.net_amount, 0);

    setStats({
      totalEarnings,
      availableBalance: Math.max(0, availableBalance),
      pendingAmount,
      totalWithdrawn,
      totalJobs: payments.length,
      currentMonthEarnings,
      avgRating: 4.8 // Pode ser calculado a partir das reviews
    });
  };

  const requestWithdrawal = async (amount: number, bankDetails: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('payouts')
        .insert({
          provider_id: user.id,
          amount,
          bank_details: bankDetails,
          status: 'pending',
          provider: 'stripe'
        });

      if (error) throw error;
      
      // Refresh data
      await fetchPayouts();
      calculateStats();
      
      return true;
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || userRole !== 'provider') {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([fetchPayments(), fetchPayouts()]);
      setLoading(false);
    };

    fetchData();
  }, [user, userRole]);

  useEffect(() => {
    calculateStats();
  }, [payments, payouts]);

  return {
    payments,
    payouts,
    stats,
    loading,
    requestWithdrawal,
    refetch: () => {
      fetchPayments();
      fetchPayouts();
    }
  };
};