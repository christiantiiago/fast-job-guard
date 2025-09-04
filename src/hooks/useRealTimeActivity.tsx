import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityEvent {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout' | 'job_created' | 'job_updated' | 'proposal_sent' | 'payment_processed' | 'kyc_uploaded' | 'dispute_created' | 'profile_updated';
  entity_type: 'user' | 'job' | 'proposal' | 'payment' | 'kyc_document' | 'dispute' | 'profile';
  entity_id?: string;
  metadata: any;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
  risk_score?: number;
  is_suspicious?: boolean;
}

export interface ActivityStats {
  totalEvents: number;
  eventsToday: number;
  suspiciousEvents: number;
  uniqueUsers: number;
  topEvents: { event_type: string; count: number }[];
  hourlyActivity: { hour: number; count: number }[];
}

export const useRealTimeActivity = (limit: number = 50) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    totalEvents: 0,
    eventsToday: 0,
    suspiciousEvents: 0,
    uniqueUsers: 0,
    topEvents: [],
    hourlyActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityEvents = useCallback(async () => {
    try {
      setLoading(true);

      // Get audit_logs without JOIN
      const { data: eventsData, error: eventsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventsError) throw eventsError;

      // Get user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) {
        console.warn('Could not fetch profiles:', profilesError);
      }

      // Transform audit logs to activity events and combine with user data
      const processedEvents: ActivityEvent[] = (eventsData || []).map(event => {
        const userProfile = profiles?.find(p => p.user_id === event.user_id);
        return {
          id: event.id,
          user_id: event.user_id || '',
          event_type: event.action as ActivityEvent['event_type'],
          entity_type: event.entity_type as ActivityEvent['entity_type'],
          entity_id: event.entity_id,
          metadata: event.metadata || {},
          created_at: event.created_at,
          user_name: userProfile?.full_name || 'Usuário não identificado',
          user_role: 'unknown',
          risk_score: 0,
          is_suspicious: false
        };
      });

      setEvents(processedEvents);

      // Calculate statistics
      await calculateStats(processedEvents);

    } catch (err) {
      console.error('Error fetching activity events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity events');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const calculateStats = async (events: ActivityEvent[]) => {
    try {
      // Get total events count from audit logs
      const { count: totalEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      // Get today's events
      const today = new Date().toISOString().split('T')[0];
      const { count: eventsToday } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Set suspicious events to 0 for now
      const suspiciousEvents = 0;

      // Get unique users from recent events
      const uniqueUsers = new Set(events.map(e => e.user_id)).size;

      // Calculate top event types
      const eventCounts = events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topEvents = Object.entries(eventCounts)
        .map(([event_type, count]) => ({ event_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate hourly activity for last 24 hours from audit logs
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: hourlyData } = await supabase
        .from('audit_logs')
        .select('created_at')
        .gte('created_at', last24Hours.toISOString());

      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
      
      if (hourlyData) {
        hourlyData.forEach(event => {
          const hour = new Date(event.created_at).getHours();
          hourlyActivity[hour].count++;
        });
      }

      setStats({
        totalEvents: totalEvents || 0,
        eventsToday: eventsToday || 0,
        suspiciousEvents: suspiciousEvents || 0,
        uniqueUsers,
        topEvents,
        hourlyActivity
      });

    } catch (error) {
      console.error('Error calculating activity stats:', error);
    }
  };

  const trackActivity = useCallback(async (
    eventType: ActivityEvent['event_type'],
    entityType: ActivityEvent['entity_type'],
    entityId?: string,
    metadata?: any
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Detect suspicious patterns
      const isSuspicious = await detectSuspiciousActivity(user.user.id, eventType, metadata);
      
      const activityData = {
        user_id: user.user.id,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {},
        is_suspicious: isSuspicious,
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
        location: metadata?.location
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: user.user.id,
          action: eventType,
          entity_type: entityType,
          entity_id: entityId,
          metadata: { ...metadata, is_suspicious: isSuspicious }
        }]);

      if (error) {
        console.error('Error tracking activity:', error);
      } else {
        // Refresh events if tracking successful
        fetchActivityEvents();
      }

    } catch (error) {
      console.error('Error in trackActivity:', error);
    }
  }, [fetchActivityEvents]);

  const detectSuspiciousActivity = async (userId: string, eventType: string, metadata: any): Promise<boolean> => {
    try {
      // Check for rapid-fire actions (same event type within 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const { count: recentSimilarEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action', eventType)
        .gte('created_at', fiveSecondsAgo);

      if ((recentSimilarEvents || 0) > 3) {
        return true; // Too many similar events in short time
      }

      // Check for location anomalies
      if (metadata?.location) {
        const { data: recentEvents } = await supabase
          .from('audit_logs')
          .select('metadata')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentEvents && recentEvents.length > 0) {
          const locations = recentEvents
            .map(e => typeof e.metadata === 'object' && e.metadata ? (e.metadata as any)?.location : null)
            .filter(Boolean);
          
          if (locations.length > 1) {
            const uniqueLocations = new Set(locations);
            if (uniqueLocations.size > 3) {
              return true; // Too many different locations recently
            }
          }
        }
      }

      // Check for unusual time patterns (activity at very unusual hours)
      const hour = new Date().getHours();
      if (hour >= 2 && hour <= 5) {
        return true; // Activity between 2-5 AM is suspicious
      }

      return false;

    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchActivityEvents();

    // Set up real-time subscription for audit logs
    const channel = supabase
      .channel('admin-activity')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => {
          fetchActivityEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivityEvents]);

  return {
    events,
    stats,
    loading,
    error,
    refetch: fetchActivityEvents,
    trackActivity
  };
};