import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  type: 'payment' | 'escrow' | 'boost' | 'subscription';
  job_title: string;
  client_name: string;
  payment_method: string;
  external_id?: string;
  release_date?: string;
  processed_at?: string;
  net_amount?: number;
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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch escrow payments (sistema principal de pagamentos) - apenas jobs ativos
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
          provider_id,
          jobs!inner(id, title, status)
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .not('jobs.status', 'in', '(cancelled,removed)')
        .order('created_at', { ascending: false });

      if (escrowError) {
        console.error('Error fetching escrow payments:', escrowError);
      }

      // Fetch job boosts
      const { data: boostsData, error: boostsError } = await supabase
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

      if (boostsError) {
        console.error('Error fetching job boosts:', boostsError);
      }

      // Fetch premium subscriptions (simplified)
      const subscriptionPayments: PaymentData[] = [];

      // Get job titles separately e filtrar jobs cancelados/removidos
      const jobIds = escrowData?.map(p => p.job_id).filter(Boolean) || [];
      let jobTitles: Record<string, string> = {};
      let validJobIds: string[] = [];
      
      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, title, status')
          .in('id', jobIds)
          .not('status', 'in', '(cancelled,removed)');
        
        validJobIds = (jobsData || []).map(job => job.id);
        jobTitles = (jobsData || []).reduce((acc, job) => {
          acc[job.id] = job.title;
          return acc;
        }, {} as Record<string, string>);
      }

      // Filtrar apenas pagamentos de jobs válidos
      const filteredEscrowData = escrowData?.filter(payment => 
        validJobIds.includes(payment.job_id)
      ) || [];

      // Get client/provider names
      const allUserIds = [
        ...(escrowData || []).map(e => user.id === e.client_id ? e.provider_id : e.client_id)
      ].filter(Boolean);

      let userNames: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', allUserIds);
        
        userNames = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = profile.full_name || 'Usuário';
          return acc;
        }, {} as Record<string, string>);
      }

      // Convert escrow to payment format - usar dados filtrados
      const escrowPayments: PaymentData[] = filteredEscrowData.map(escrow => {
        const isClient = escrow.client_id === user.id;
        const otherUserId = isClient ? escrow.provider_id : escrow.client_id;
        
        return {
          id: escrow.id,
          amount: escrow.amount,
          type: 'escrow',
          status: escrow.status === 'released' ? 'completed' : escrow.status,
          job_title: jobTitles[escrow.job_id] || 'Trabalho removido',
          client_name: userNames[otherUserId] || (isClient ? 'Prestador' : 'Cliente'),
          created_at: escrow.created_at,
          payment_method: 'Pagamento em Garantia',
          external_id: escrow.id,
          release_date: escrow.release_date,
          processed_at: escrow.completed_at || escrow.created_at,
          net_amount: escrow.amount
        };
      });

      // Buscar títulos dos jobs para boosts também, filtrando jobs cancelados
      let boostJobTitles: Record<string, string> = {};
      const boostJobIds = (boostsData || []).map(b => b.job_id).filter(Boolean);
      
      if (boostJobIds.length > 0) {
        const { data: boostJobsData } = await supabase
          .from('jobs')
          .select('id, title, status')
          .in('id', boostJobIds)
          .not('status', 'in', '(cancelled,removed)');
        
        boostJobTitles = (boostJobsData || []).reduce((acc, job) => {
          acc[job.id] = job.title;
          return acc;
        }, {} as Record<string, string>);
      }

      // Convert boosts to payment format - usar apenas boosts de jobs válidos
      const boostPayments: PaymentData[] = (boostsData || [])
        .filter(boost => boostJobTitles[boost.job_id]) // Filtrar boosts de jobs válidos
        .map(boost => ({
          id: boost.id,
          amount: boost.amount,
          type: 'boost',
          status: boost.status === 'active' || boost.status === 'expired' ? 'completed' : boost.status,
          job_title: boostJobTitles[boost.job_id] || 'Impulsionamento',
          client_name: 'Job Fast Platform',
          created_at: boost.created_at,
          payment_method: 'Impulsionamento',
          external_id: boost.id,
          processed_at: boost.activated_at || boost.created_at,
          net_amount: boost.amount
        }));

      setPayments([...escrowPayments, ...boostPayments, ...subscriptionPayments]);
      
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
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

  const calculateStats = (paymentsData: PaymentData[], payoutsData: PayoutData[]) => {
    let newStats: any = {};
    
    if (userRole === 'client') {
      // Estatísticas para cliente
      const totalSpent = paymentsData
        .filter(p => p.status === 'completed' || p.status === 'released')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const pendingAmount = paymentsData
        .filter(p => p.status === 'pending' || p.status === 'held')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const completedJobs = paymentsData
        .filter(p => (p.status === 'completed' || p.status === 'released') && p.type === 'escrow').length;
      
      const pendingJobs = paymentsData
        .filter(p => (p.status === 'pending' || p.status === 'held') && p.type === 'escrow').length;
      
      const currentMonthEarnings = paymentsData
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          const currentDate = new Date();
          return (p.status === 'completed' || p.status === 'released') && 
                 paymentDate.getMonth() === currentDate.getMonth() &&
                 paymentDate.getFullYear() === currentDate.getFullYear();
        })
        .reduce((sum, p) => sum + p.amount, 0);

      newStats = {
        totalEarnings: 0,
        totalExpenses: totalSpent,
        availableBalance: 0,
        pendingAmount,
        completedJobs,
        pendingJobs,
        totalWithdrawn: 0,
        pendingWithdrawals: 0,
        totalTransactions: paymentsData.length,
        activeBoosts: paymentsData.filter(p => p.type === 'boost' && p.status === 'active').length,
        currentMonthEarnings,
        totalJobs: completedJobs + pendingJobs,
        avgRating: 4.8
      };
    } else {
      // Estatísticas para prestador
      const totalEarnings = paymentsData
        .filter(p => (p.status === 'completed' || p.status === 'released') && p.type === 'escrow')
        .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);
      
      const totalExpenses = paymentsData
        .filter(p => p.status === 'completed' && (p.type === 'boost' || p.type === 'subscription'))
        .reduce((sum, p) => sum + p.amount, 0);
      
      const totalWithdrawn = payoutsData
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const availableBalance = totalEarnings - totalWithdrawn;
      
      const pendingAmount = paymentsData
        .filter(p => (p.status === 'pending' || p.status === 'held') && p.type === 'escrow')
        .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);
      
      const pendingWithdrawals = payoutsData
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const completedJobs = paymentsData
        .filter(p => (p.status === 'completed' || p.status === 'released') && p.type === 'escrow').length;
      
      const pendingJobs = paymentsData
        .filter(p => (p.status === 'pending' || p.status === 'held') && p.type === 'escrow').length;
      
      const currentMonthEarnings = paymentsData
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          const currentDate = new Date();
          return (p.status === 'completed' || p.status === 'released') && 
                 p.type === 'escrow' &&
                 paymentDate.getMonth() === currentDate.getMonth() &&
                 paymentDate.getFullYear() === currentDate.getFullYear();
        })
        .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

      newStats = {
        totalEarnings,
        totalExpenses,
        availableBalance: Math.max(0, availableBalance),
        pendingAmount,
        completedJobs,
        pendingJobs,
        totalWithdrawn,
        pendingWithdrawals,
        totalTransactions: paymentsData.length,
        activeBoosts: paymentsData.filter(p => p.type === 'boost' && (p.status === 'active' || p.status === 'completed')).length,
        currentMonthEarnings,
        totalJobs: completedJobs + pendingJobs,
        avgRating: 4.8
      };
    }
    
    setStats(newStats);
    return newStats;
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
          provider: 'mercadopago'
        });

      if (error) throw error;
      
      await fetchPayouts();
      calculateStats([], []);
      
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
      calculateStats(payments, payouts);
      setLoading(false);
    };

    fetchData();
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