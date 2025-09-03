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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      // Mock data para demonstração (em produção usar dados reais)
      const mockRevenueData = [
        { month: 'Jan 2024', revenue: 15000, platformFee: 750 },
        { month: 'Fev 2024', revenue: 18500, platformFee: 925 },
        { month: 'Mar 2024', revenue: 22000, platformFee: 1100 },
        { month: 'Abr 2024', revenue: 26000, platformFee: 1300 },
        { month: 'Mai 2024', revenue: 31000, platformFee: 1550 },
        { month: 'Jun 2024', revenue: 28000, platformFee: 1400 },
      ];

      const mockUserGrowthData = [
        { month: 'Jan 2024', newUsers: 45, activeUsers: 120 },
        { month: 'Fev 2024', newUsers: 62, activeUsers: 150 },
        { month: 'Mar 2024', newUsers: 78, activeUsers: 185 },
        { month: 'Abr 2024', newUsers: 95, activeUsers: 220 },
        { month: 'Mai 2024', newUsers: 110, activeUsers: 280 },
        { month: 'Jun 2024', newUsers: 125, activeUsers: 340 },
      ];

      const mockJobsData = [
        { month: 'Jan 2024', created: 85, completed: 72, cancelled: 8 },
        { month: 'Fev 2024', created: 102, completed: 89, cancelled: 6 },
        { month: 'Mar 2024', created: 118, completed: 105, cancelled: 9 },
        { month: 'Abr 2024', created: 134, completed: 120, cancelled: 7 },
        { month: 'Mai 2024', created: 156, completed: 142, cancelled: 5 },
        { month: 'Jun 2024', created: 173, completed: 161, cancelled: 4 },
      ];

      const mockGeographicData = [
        { city: 'São Paulo', state: 'SP', users: 245, revenue: 89000 },
        { city: 'Rio de Janeiro', state: 'RJ', users: 180, revenue: 65000 },
        { city: 'Belo Horizonte', state: 'MG', users: 120, revenue: 42000 },
        { city: 'Salvador', state: 'BA', users: 95, revenue: 32000 },
        { city: 'Fortaleza', state: 'CE', users: 78, revenue: 28000 },
        { city: 'Brasília', state: 'DF', users: 65, revenue: 24000 },
        { city: 'Curitiba', state: 'PR', users: 58, revenue: 21000 },
        { city: 'Recife', state: 'PE', users: 52, revenue: 18500 },
        { city: 'Goiânia', state: 'GO', users: 45, revenue: 16000 },
        { city: 'Belém', state: 'PA', users: 38, revenue: 13500 },
      ];

      setData({
        revenueData: mockRevenueData,
        userGrowthData: mockUserGrowthData,
        jobsData: mockJobsData,
        geographicData: mockGeographicData
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar analytics');
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
    // Carregar dados mockados para evitar problemas de API
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