import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalRevenue: number;
  escrowAmount: number;
  openDisputes: number;
  pendingKyc: number;
  totalProviders: number;
  totalClients: number;
  totalAdmins: number;
  averageJobValue: number;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas em paralelo
      const [
        usersResult,
        jobsResult,
        paymentsResult,
        disputesResult,
        kycResult,
        rolesResult
      ] = await Promise.all([
        // Total de usuários
        supabase
          .from('profiles')
          .select('created_at', { count: 'exact' }),
        
        // Jobs por status
        supabase
          .from('jobs')
          .select('status, final_price', { count: 'exact' }),
        
        // Pagamentos
        supabase
          .from('payments')
          .select('amount, status', { count: 'exact' }),
        
        // Disputas abertas
        supabase
          .from('disputes')
          .select('*', { count: 'exact' })
          .eq('status', 'open'),
        
        // KYC pendente
        supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .eq('kyc_status', 'pending'),
        
        // Roles dos usuários
        supabase
          .from('user_roles')
          .select('role', { count: 'exact' })
      ]);

      if (usersResult.error) throw usersResult.error;
      if (jobsResult.error) throw jobsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (disputesResult.error) throw disputesResult.error;
      if (kycResult.error) throw kycResult.error;
      if (rolesResult.error) throw rolesResult.error;

      // Calcular estatísticas
      const totalUsers = usersResult.count || 0;
      const jobs = jobsResult.data || [];
      const payments = paymentsResult.data || [];
      const roles = rolesResult.data || [];
      
      // Contar novos usuários deste mês
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newUsersThisMonth = (usersResult.data || []).filter(user => 
        new Date(user.created_at) >= firstDayOfMonth
      ).length;

      // Jobs por status
      const activeJobs = jobs.filter(job => job.status === 'in_progress').length;
      const completedJobs = jobs.filter(job => job.status === 'completed').length;

      // Receita e escrow
      const completedPayments = payments.filter(p => p.status === 'released');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      const escrowPayments = payments.filter(p => p.status === 'pending' || p.status === 'held');
      const escrowAmount = escrowPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Contagem por roles
      const totalProviders = roles.filter(r => r.role === 'provider').length;
      const totalClients = roles.filter(r => r.role === 'client').length;
      const totalAdmins = roles.filter(r => r.role === 'admin').length;

      // Valor médio dos jobs
      const jobsWithPrice = jobs.filter(job => job.final_price);
      const averageJobValue = jobsWithPrice.length > 0 
        ? jobsWithPrice.reduce((sum, job) => sum + (Number(job.final_price) || 0), 0) / jobsWithPrice.length
        : 0;

      setStats({
        totalUsers,
        newUsersThisMonth,
        totalJobs: jobs.length,
        activeJobs,
        completedJobs,
        totalRevenue,
        escrowAmount,
        openDisputes: disputesResult.count || 0,
        pendingKyc: kycResult.count || 0,
        totalProviders,
        totalClients,
        totalAdmins,
        averageJobValue
      });

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};