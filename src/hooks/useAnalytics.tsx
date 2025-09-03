import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  revenueData: Array<{
    month: string;
    revenue: number;
    platformFee: number;
  }>;
  userGrowthData: Array<{
    month: string;
    newUsers: number;
    activeUsers: number;
  }>;
  jobsData: Array<{
    month: string;
    created: number;
    completed: number;
    cancelled: number;
  }>;
  geographicData: Array<{
    city: string;
    state: string;
    users: number;
    revenue: number;
  }>;
}

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    revenueData: [],
    userGrowthData: [],
    jobsData: [],
    geographicData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Revenue data - últimos 12 meses
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('created_at, amount, platform_fee')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      if (paymentsError) throw paymentsError;

      // User growth data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at, user_id')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      if (profilesError) throw profilesError;

      // Jobs data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('created_at, status, updated_at')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      if (jobsError) throw jobsError;

      // Geographic data
      const { data: addresses, error: addressError } = await supabase
        .from('addresses')
        .select(`
          city, 
          state,
          user_id,
          jobs!inner(final_price)
        `)
        .not('city', 'is', null)
        .not('state', 'is', null);

      if (addressError) throw addressError;

      // Process revenue data
      const revenueByMonth = processMonthlyData(payments || [], (item) => ({
        revenue: Number(item.amount) || 0,
        platformFee: Number(item.platform_fee) || 0
      }));

      // Process user growth data  
      const usersByMonth = processMonthlyData(profiles || [], () => ({ newUsers: 1 }));

      // Process jobs data
      const jobsByMonth = processJobsData(jobs || []);

      // Process geographic data
      const geographicProcessed = processGeographicData(addresses || []);

      setData({
        revenueData: revenueByMonth,
        userGrowthData: usersByMonth,
        jobsData: jobsByMonth,
        geographicData: geographicProcessed
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (data: any[], valueExtractor: (item: any) => any) => {
    const monthlyData = new Map<string, any>();
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      monthlyData.set(monthKey, {
        month: monthName,
        revenue: 0,
        platformFee: 0,
        newUsers: 0,
        activeUsers: 0
      });
    }

    // Aggregate data
    data.forEach(item => {
      const monthKey = item.created_at.slice(0, 7);
      if (monthlyData.has(monthKey)) {
        const existing = monthlyData.get(monthKey);
        const values = valueExtractor(item);
        
        Object.keys(values).forEach(key => {
          existing[key] = (existing[key] || 0) + values[key];
        });
      }
    });

    return Array.from(monthlyData.values());
  };

  const processJobsData = (jobs: any[]) => {
    const monthlyJobs = new Map<string, any>();
    
    // Initialize months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      monthlyJobs.set(monthKey, {
        month: monthName,
        created: 0,
        completed: 0,
        cancelled: 0
      });
    }

    jobs.forEach(job => {
      const createdMonth = job.created_at.slice(0, 7);
      if (monthlyJobs.has(createdMonth)) {
        monthlyJobs.get(createdMonth).created++;
      }

      if (job.status === 'completed' && job.updated_at) {
        const completedMonth = job.updated_at.slice(0, 7);
        if (monthlyJobs.has(completedMonth)) {
          monthlyJobs.get(completedMonth).completed++;
        }
      }

      if (job.status === 'cancelled' && job.updated_at) {
        const cancelledMonth = job.updated_at.slice(0, 7);
        if (monthlyJobs.has(cancelledMonth)) {
          monthlyJobs.get(cancelledMonth).cancelled++;
        }
      }
    });

    return Array.from(monthlyJobs.values());
  };

  const processGeographicData = (addresses: any[]) => {
    const locationMap = new Map<string, { users: Set<string>, revenue: number }>();

    addresses.forEach(address => {
      const key = `${address.city}, ${address.state}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { users: new Set(), revenue: 0 });
      }
      
      const location = locationMap.get(key)!;
      location.users.add(address.user_id);
      
      // Sum revenue from jobs
      if (address.jobs?.length) {
        address.jobs.forEach((job: any) => {
          if (job.final_price) {
            location.revenue += Number(job.final_price);
          }
        });
      }
    });

    return Array.from(locationMap.entries())
      .map(([location, data]) => {
        const [city, state] = location.split(', ');
        return {
          city,
          state,
          users: data.users.size,
          revenue: data.revenue
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      // Implement export functionality
      const reportData = {
        generated_at: new Date().toISOString(),
        data,
        format
      };

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'analytics_export',
          entity_type: 'report',
          metadata: { format, timestamp: new Date().toISOString() }
        });

      // In a real implementation, you would generate and download the file
      console.log('Exporting report:', reportData);
      
      // Mock download
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${Date.now()}.${format === 'pdf' ? 'json' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export error:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    ...data,
    loading,
    error,
    refetch: fetchAnalytics,
    exportReport
  };
};