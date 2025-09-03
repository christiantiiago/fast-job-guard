import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealTimeUser {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  created_at: string;
  is_verified: boolean;
  role: string | null;
  total_jobs: number;
  total_earnings: number;
  last_login: string | null;
  status: 'active' | 'suspended' | 'pending';
}

export const useRealTimeUsers = () => {
  const [users, setUsers] = useState<RealTimeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users with their profiles and roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles!inner(role)
        `);

      if (profilesError) throw profilesError;

      // Get job statistics for each user
      const { data: jobStats, error: jobStatsError } = await supabase
        .from('jobs')
        .select('client_id, provider_id, final_price, status');

      if (jobStatsError) throw jobStatsError;

      // Process and combine data
      const processedUsers: RealTimeUser[] = profiles.map(profile => {
        const userJobs = jobStats?.filter(job => 
          job.client_id === profile.user_id || job.provider_id === profile.user_id
        ) || [];
        
        const totalJobs = userJobs.length;
        const totalEarnings = userJobs
          .filter(job => job.provider_id === profile.user_id && job.final_price)
          .reduce((sum, job) => sum + (job.final_price || 0), 0);

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          phone: profile.phone,
          kyc_status: profile.kyc_status,
          created_at: profile.created_at,
          is_verified: profile.is_verified,
          role: Array.isArray(profile.user_roles) ? profile.user_roles[0]?.role : null,
          total_jobs: totalJobs,
          total_earnings: totalEarnings,
          last_login: null, // This would need auth logs to populate
          status: profile.is_verified ? 'active' : 'pending' as 'active' | 'suspended' | 'pending'
        };
      });

      setUsers(processedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: status === 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: `user_${status}`,
          entity_type: 'user',
          entity_id: userId,
          metadata: { status }
        });

      await fetchUsers();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  };

  const createAdmin = async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => {
    try {
      // This would typically be done through an admin function
      // For now, we'll create the audit log for the attempt
      await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'admin_create_attempt',
          entity_type: 'user',
          metadata: { email: userData.email, full_name: userData.full_name }
        });

      // Note: Actual user creation would need to be done server-side
      throw new Error('Criação de admin deve ser implementada via função do servidor');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar admin');
    }
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    updateUserStatus,
    createAdmin
  };
};