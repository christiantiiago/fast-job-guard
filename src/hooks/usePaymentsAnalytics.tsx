import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Payment = Database['public']['Tables']['payments']['Row'];
type EscrowPayment = Database['public']['Tables']['escrow_payments']['Row'];

export interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  pendingAmount: number;
  completedAmount: number;
  averageTransaction: number;
  monthlyGrowth: number;
  revenueByCategory: { category: string; amount: number; percentage: number }[];
  transactionsByStatus: { status: string; count: number; percentage: number }[];
  recentTransactions: any[];
  topProviders: { provider_name: string; total_earnings: number; transaction_count: number }[];
  dailyRevenue: { date: string; amount: number }[];
}

export function usePaymentsAnalytics() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados de pagamentos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          jobs:job_id (
            title,
            client_id,
            provider_id,
            category_id,
            created_at
          )
        `);

      if (paymentsError) {
        console.error('Error fetching payments data:', paymentsError);
        throw paymentsError;
      }

      // Buscar dados de escrow
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_payments')
        .select('*');

      if (escrowError) {
        console.error('Error fetching escrow data:', escrowError);
        throw escrowError;
      }

      // Buscar dados de perfis para nomes dos provedores
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) {
        console.error('Error fetching profiles data:', profilesError);
        throw profilesError;
      }

      // Processar estatísticas
      const processedStats = processPaymentStats(paymentsData || [], escrowData || [], profilesData || []);
      setStats(processedStats);

    } catch (err: any) {
      console.error('Error in fetchPaymentsData:', err);
      setError(err.message || 'Erro ao carregar dados de pagamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  const refetch = useCallback(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  return {
    stats,
    loading,
    error,
    refetch
  };
}

function processPaymentStats(
  payments: any[], 
  escrowPayments: any[], 
  profiles: any[]
): PaymentStats {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Combinar pagamentos regulares e escrow
  const allPayments = [...payments, ...escrowPayments.map(ep => ({
    ...ep,
    amount: ep.total_amount || ep.amount
  }))];

  // Calcular totais
  const totalRevenue = allPayments
    .filter(p => p.status === 'completed' || p.status === 'released')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalTransactions = allPayments.length;

  const pendingAmount = allPayments
    .filter(p => p.status === 'pending' || p.status === 'held')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const completedAmount = allPayments
    .filter(p => p.status === 'completed' || p.status === 'released')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calcular crescimento mensal
  const currentMonthRevenue = allPayments
    .filter(p => {
      const paymentDate = new Date(p.created_at);
      return paymentDate >= thirtyDaysAgo && (p.status === 'completed' || p.status === 'released');
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const lastMonthRevenue = allPayments
    .filter(p => {
      const paymentDate = new Date(p.created_at);
      return paymentDate >= lastMonth && paymentDate < thirtyDaysAgo && (p.status === 'completed' || p.status === 'released');
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const monthlyGrowth = lastMonthRevenue > 0 ? 
    ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Transações por status
  const statusCounts = allPayments.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const transactionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count: Number(count) || 0,
    percentage: ((Number(count) || 0) / totalTransactions) * 100
  }));

  // Top provedores
  const providerStats = allPayments
    .filter(p => p.provider_id && (p.status === 'completed' || p.status === 'released'))
    .reduce((acc, p) => {
      const providerId = p.provider_id;
      if (!acc[providerId]) {
        acc[providerId] = { total_earnings: 0, transaction_count: 0 };
      }
      acc[providerId].total_earnings += Number(p.amount) || 0;
      acc[providerId].transaction_count += 1;
      return acc;
    }, {} as Record<string, { total_earnings: number; transaction_count: number }>);

  const topProviders = Object.entries(providerStats)
    .map(([providerId, stats]) => {
      const profile = profiles.find(p => p.user_id === providerId);
      const typedStats = stats as { total_earnings: number; transaction_count: number };
      return {
        provider_name: profile?.full_name || 'Usuário Desconhecido',
        total_earnings: typedStats.total_earnings,
        transaction_count: typedStats.transaction_count
      };
    })
    .sort((a, b) => b.total_earnings - a.total_earnings)
    .slice(0, 10);

  // Receita diária (últimos 30 dias)
  const dailyRevenue = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayRevenue = allPayments
      .filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.toISOString().split('T')[0] === dateStr && 
               (p.status === 'completed' || p.status === 'released');
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    dailyRevenue.push({
      date: dateStr,
      amount: dayRevenue
    });
  }

  // Receita por categoria (simulada)
  const revenueByCategory = [
    { category: 'Serviços Domésticos', amount: totalRevenue * 0.35, percentage: 35 },
    { category: 'Tecnologia', amount: totalRevenue * 0.25, percentage: 25 },
    { category: 'Educação', amount: totalRevenue * 0.20, percentage: 20 },
    { category: 'Saúde', amount: totalRevenue * 0.15, percentage: 15 },
    { category: 'Outros', amount: totalRevenue * 0.05, percentage: 5 }
  ];

  // Transações recentes
  const recentTransactions = allPayments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      created_at: p.created_at,
      type: p.job_id ? 'Pagamento de Job' : 'Escrow'
    }));

  return {
    totalRevenue,
    totalTransactions,
    pendingAmount,
    completedAmount,
    averageTransaction,
    monthlyGrowth,
    revenueByCategory,
    transactionsByStatus,
    recentTransactions,
    topProviders,
    dailyRevenue
  };
}