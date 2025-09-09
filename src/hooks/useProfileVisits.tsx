import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePremiumStatus } from './usePremiumStatus';

interface ProfileVisitStats {
  total_visits: number;
  unique_visitors: number;
  recent_visits: number;
}

interface ProfileVisitor {
  visitor_id: string;
  visitor_name: string;
  visitor_avatar: string;
  visit_date: string;
}

export const useProfileVisits = (profileUserId?: string) => {
  const { user } = useAuth();
  const { premiumStatus } = usePremiumStatus();
  const [stats, setStats] = useState<ProfileVisitStats>({ total_visits: 0, unique_visitors: 0, recent_visits: 0 });
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([]);
  const [loading, setLoading] = useState(true);

  // Registrar visita ao perfil
  const recordVisit = async (visitedUserId: string) => {
    if (!user || user.id === visitedUserId) return; // Não registrar auto-visitas

    try {
      await supabase.from('profile_visits').insert({
        visitor_id: user.id,
        visited_user_id: visitedUserId,
        ip_address: null, // Pode ser implementado no futuro
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error recording profile visit:', error);
    }
  };

  // Buscar estatísticas de visitas
  const fetchStats = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_profile_visit_stats', {
        target_user_id: targetUserId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setStats({
          total_visits: Number(data[0].total_visits),
          unique_visitors: Number(data[0].unique_visitors),
          recent_visits: Number(data[0].recent_visits)
        });
      }
    } catch (error) {
      console.error('Error fetching visit stats:', error);
    }
  };

  // Buscar visitantes (apenas para premium)
  const fetchVisitors = async (targetUserId: string) => {
    if (!premiumStatus.is_premium || targetUserId !== user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_profile_visitors', {
        target_user_id: targetUserId,
        limit_count: 20
      });

      if (error) throw error;
      setVisitors(data || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profileUserId) return;

      setLoading(true);
      await Promise.all([
        fetchStats(profileUserId),
        fetchVisitors(profileUserId)
      ]);
      setLoading(false);
    };

    fetchData();
  }, [profileUserId, premiumStatus.is_premium, user?.id]);

  return {
    stats,
    visitors,
    loading,
    recordVisit,
    refetch: () => {
      if (profileUserId) {
        fetchStats(profileUserId);
        fetchVisitors(profileUserId);
      }
    }
  };
};