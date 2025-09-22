import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  type: 'payment' | 'escrow' | 'boost';
  job_title: string;
  client_name: string;
  payment_method: string;
  external_id?: string;
  release_date?: string;
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
  totalExpenses: number;
  availableBalance: number;
  pendingAmount: number;
  completedJobs: number;
  pendingJobs: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  totalTransactions: number;
  activeBoosts: number;
  currentMonthEarnings: number;
  totalJobs: number;
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
    pendingAmount: 0,
    completedJobs: 0,
    pendingJobs: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    totalTransactions: 0,
    activeBoosts: 0,
    currentMonthEarnings: 0,
    totalJobs: 0,
    avgRating: 4.8
  });
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!user) return [];
    
    try {
      // Fetch escrow payments 
      const { data: escrowPayments, error: escrowError } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          amount,
          status,
          created_at,
          release_date,
          external_payment_id,
          job_id,
          client_id
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (escrowError) throw escrowError;

      // Get job titles and client names separately
      const jobIds = (escrowPayments || []).map(p => p.job_id).filter(Boolean);
      const clientIds = (escrowPayments || []).map(p => p.client_id).filter(Boolean);
      
      let jobTitles: Record<string, string> = {};
      let clientNames: Record<string, string> = {};
      
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
      
      if (clientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', clientIds);
        
        clientNames = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = profile.full_name || 'Cliente não identificado';
          return acc;
        }, {} as Record<string, string>);
      }

      // Transform escrow payments
      const transformedEscrow: PaymentData[] = (escrowPayments || []).map(escrow => ({
        id: escrow.id,
        amount: escrow.amount,
        status: escrow.status,
        created_at: escrow.created_at,
        type: 'escrow',
        job_title: jobTitles[escrow.job_id] || 'Trabalho não identificado',
        client_name: clientNames[escrow.client_id] || 'Cliente não identificado',
        payment_method: 'escrow',
        external_id: escrow.external_payment_id,
        release_date: escrow.release_date
      }));

      setPayments(transformedEscrow);
      return transformedEscrow;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
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
    if (!payments || !payouts) return;

    const earnings = payments.filter(p => p.type !== 'boost' && p.amount > 0);
    const expenses = payments.filter(p => p.type === 'boost' || p.amount < 0);

    const totalEarnings = earnings
      .filter(p => p.status === 'released' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalExpenses = Math.abs(expenses
      .filter(p => p.status === 'active' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0));

    const pendingAmount = earnings
      .filter(p => p.status === 'held' || p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalWithdrawn = payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingWithdrawals = payouts
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = totalEarnings - totalWithdrawn - pendingWithdrawals;

    // Current month earnings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthEarnings = earnings
      .filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               (p.status === 'released' || p.status === 'completed');
      })
      .reduce((sum, p) => sum + p.amount, 0);

    setStats({
      totalEarnings,
      totalExpenses,
      availableBalance: Math.max(0, availableBalance),
      pendingAmount,
      completedJobs: earnings.filter(p => p.status === 'released' || p.status === 'completed').length,
      pendingJobs: earnings.filter(p => p.status === 'held' || p.status === 'pending').length,
      totalWithdrawn,
      pendingWithdrawals,
      totalTransactions: payments.length,
      activeBoosts: expenses.filter(p => p.status === 'active').length,
      currentMonthEarnings,
      totalJobs: earnings.filter(p => p.status === 'released' || p.status === 'completed').length,
      avgRating: 4.8
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
          provider: 'pix'
        });

      if (error) throw error;
      
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
    refetch: async () => {
      await fetchPayments();
      await fetchPayouts();
    }
  };
};