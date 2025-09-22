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
      // Fetch regular payments
      const { data: paymentsData, error: paymentsError } = await supabase
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

      if (paymentsError) throw paymentsError;

      // Fetch escrow payments for provider
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          amount,
          platform_fee,
          status,
          created_at,
          completed_at,
          job_id
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (escrowError) throw escrowError;

      // Get job titles for escrow payments
      const jobIds = [...(paymentsData || []).map(p => p.job_id), ...(escrowData || []).map(p => p.job_id)].filter(Boolean);
      let jobTitles: Record<string, string> = {};
      
      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, title')
          .in('id', jobIds);
        
        jobTitles = (jobsData || []).reduce((acc, job) => {
          acc[job.id] = job.title;
          return acc;
        }, {} as Record<string, string>);
      }

      // Format regular payments
      const formattedPayments = (paymentsData || []).map(payment => ({
        ...payment,
        job_title: payment.jobs?.title || jobTitles[payment.job_id] || 'Trabalho removido'
      }));

      // Format escrow payments as payments
      const formattedEscrowPayments = (escrowData || []).map(escrow => ({
        id: escrow.id,
        amount: escrow.amount,
        net_amount: escrow.amount, // Provider gets the amount minus platform fee
        client_fee: 0,
        provider_fee: escrow.platform_fee,
        platform_fee: escrow.platform_fee,
        status: escrow.status === 'held' ? 'pending' : escrow.status,
        created_at: escrow.created_at,
        processed_at: escrow.completed_at || escrow.created_at,
        job_id: escrow.job_id,
        job_title: jobTitles[escrow.job_id] || 'Trabalho removido'
      }));

      // Combine and sort all payments
      const allPayments = [...formattedPayments, ...formattedEscrowPayments]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPayments(allPayments);
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
    if (!payments.length) {
      setStats({
        totalEarnings: 0,
        availableBalance: 0,
        pendingAmount: 0,
        totalWithdrawn: 0,
        totalJobs: 0,
        currentMonthEarnings: 0,
        avgRating: 4.8
      });
      return;
    }

    const completedPayments = payments.filter(p => p.status === 'completed' || p.status === 'released');
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'held');
    const totalWithdrawn = payouts
      .filter(p => p.status === 'completed' || p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalEarnings = completedPayments.reduce((sum, p) => sum + p.net_amount, 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.net_amount, 0);
    const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);

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
      availableBalance,
      pendingAmount,
      totalWithdrawn,
      totalJobs: completedPayments.length,
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