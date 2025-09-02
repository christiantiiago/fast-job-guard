import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Job {
  id: string;
  title: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: 'draft' | 'open' | 'in_proposal' | 'in_progress' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  created_at: string;
  updated_at: string;
  client_id: string;
  provider_id?: string;
  category_id: string;
  address_id?: string;
  latitude?: number;
  longitude?: number;
  scheduled_at?: string;
  deadline_at?: string;
  images?: string[];
  requirements?: string;
  // Relations
  service_categories?: {
    name: string;
    icon_name?: string;
  } | null;
  profiles?: {
    full_name?: string;
  } | null;
  proposals?: Array<{
    id: string;
    price: number;
    message?: string;
    status: string;
    provider_id: string;
    profiles: {
      full_name?: string;
    } | null;
  }>;
  addresses?: {
    street: string;
    city: string;
    state: string;
    neighborhood?: string;
  } | null;
}

export const useJobs = () => {
  const { user, userRole } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('jobs')
        .select(`
          *,
          service_categories(name, icon_name),
          addresses(street, city, state, neighborhood),
          proposals(
            id,
            price,
            message,
            status,
            provider_id
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by user role
      if (userRole === 'client') {
        query = query.eq('client_id', user?.id);
      } else if (userRole === 'provider') {
        // For providers, show jobs they can apply to (open jobs) or jobs they're working on
        query = query.or(`status.eq.open,provider_id.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        setError(error.message);
        return;
      }

      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error('Exception fetching jobs:', err);
      setError('Erro ao carregar trabalhos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOpenJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          service_categories(name, icon_name),
          addresses(street, city, state, neighborhood),
          proposals(
            id,
            price,
            message,
            status,
            provider_id
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching open jobs:', error);
        setError(error.message);
        return;
      }

      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error('Exception fetching open jobs:', err);
      setError('Erro ao carregar trabalhos');
    } finally {
      setLoading(false);
    }
  };

  // Nova função para buscar TODOS os jobs públicos sem restrições de usuário
  const fetchAllPublicJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          service_categories(name, icon_name),
          addresses(street, city, state, neighborhood),
          proposals(
            id,
            price,
            message,
            status,
            provider_id
          )
        `)
        .in('status', ['open', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all public jobs:', error);
        setError(error.message);
        return;
      }

      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error('Exception fetching all public jobs:', err);
      setError('Erro ao carregar trabalhos');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          service_categories(name, icon_name),
          addresses(street, city, state, neighborhood),
          proposals(
            id,
            price,
            message,
            status,
            delivery_date,
            estimated_hours,
            notes,
            provider_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching job:', err);
      throw err;
    }
  };

  const createJob = async (jobData: {
    title: string;
    description: string;
    category_id: string;
    budget_min?: number;
    budget_max?: number;
    address_id?: string;
    latitude?: number;
    longitude?: number;
    scheduled_at?: string;
    deadline_at?: string;
    images?: string[];
    requirements?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          ...jobData,
          client_id: user?.id,
          status: 'open' as const
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh jobs list
      fetchJobs();
      
      return data;
    } catch (err) {
      console.error('Error creating job:', err);
      throw err;
    }
  };

  const updateJobStatus = async (jobId: string, status: Job['status']) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId);

      if (error) throw error;
      
      // Refresh jobs list
      fetchJobs();
    } catch (err) {
      console.error('Error updating job status:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user && userRole) {
      fetchJobs();
    }
  }, [user, userRole]);

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    fetchAllOpenJobs,
    fetchAllPublicJobs,
    fetchJobById,
    createJob,
    updateJobStatus,
    refetch: fetchJobs
  };
};

// Hook for job statistics
export const useJobStats = () => {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !userRole) return;

      try {
        setLoading(true);

        if (userRole === 'client') {
          // Client stats
          const { data: allJobs } = await supabase
            .from('jobs')
            .select('status')
            .eq('client_id', user.id);

          const totalJobs = allJobs?.length || 0;
          const activeJobs = allJobs?.filter(j => j.status === 'in_progress').length || 0;
          const completedJobs = allJobs?.filter(j => j.status === 'completed').length || 0;
          const openJobs = allJobs?.filter(j => j.status === 'open').length || 0;

          setStats({
            totalJobs,
            activeJobs,
            completedJobs,
            openJobs
          });
        } else if (userRole === 'provider') {
          // Provider stats
          const { data: proposals } = await supabase
            .from('proposals')
            .select('status, jobs!inner(status)')
            .eq('provider_id', user.id);

          const { data: activeJobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('provider_id', user.id)
            .eq('status', 'in_progress');

          const { data: completedJobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('provider_id', user.id)
            .eq('status', 'completed');

          // Get earnings from completed payments
          const { data: payments } = await supabase
            .from('payments')
            .select('net_amount')
            .eq('provider_id', user.id)
            .eq('status', 'released');

          const totalEarnings = payments?.reduce((sum, p) => sum + Number(p.net_amount), 0) || 0;

          setStats({
            appliedJobs: proposals?.length || 0,
            activeJobs: activeJobs?.length || 0,
            completedJobs: completedJobs?.length || 0,
            earnings: totalEarnings
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userRole]);

  return { stats, loading };
};