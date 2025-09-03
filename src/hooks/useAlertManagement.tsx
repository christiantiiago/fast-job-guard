import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';

export interface Alert {
  id: string;
  type: 'security' | 'fraud' | 'system' | 'compliance' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: any;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  auto_dismiss_at?: string;
}

interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  severity: Alert['severity'];
  conditions: any;
  enabled: boolean;
  created_at: string;
}

interface AlertStats {
  total: number;
  active: number;
  critical: number;
  resolved_today: number;
  by_type: { type: string; count: number }[];
  by_severity: { severity: string; count: number }[];
}

export const useAlertManagement = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    critical: 0,
    resolved_today: 0,
    by_type: [],
    by_severity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { createNotification } = useNotifications();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);

      // Use audit_logs as alerts until admin_alerts table types are available
      const { data: alertsData, error: alertsError } = await supabase
        .from('audit_logs')
        .select('*')
        .or('action.like.%alert%,action.like.%fraud%,action.like.%security%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (alertsError) throw alertsError;

      // Transform audit logs to alert format
      const transformedAlerts: Alert[] = (alertsData || []).map(log => ({
        id: log.id,
        type: log.action.includes('fraud') ? 'fraud' : 
              log.action.includes('security') ? 'security' : 'system',
        severity: log.action.includes('critical') ? 'critical' : 
                 log.action.includes('high') ? 'high' : 'medium',
        title: log.action.replace(/_/g, ' ').toUpperCase(),
        message: `${log.entity_type} ${log.action}`,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        metadata: log.metadata || {},
        status: 'active' as const,
        created_at: log.created_at
      }));

      setAlerts(transformedAlerts);
      calculateStats(transformedAlerts);

    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = (alertsData: Alert[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const total = alertsData.length;
    const active = alertsData.filter(a => a.status === 'active').length;
    const critical = alertsData.filter(a => a.severity === 'critical' && a.status === 'active').length;
    const resolved_today = alertsData.filter(a => 
      a.status === 'resolved' && a.resolved_at?.startsWith(today)
    ).length;

    // Group by type
    const typeGroups = alertsData.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const by_type = Object.entries(typeGroups).map(([type, count]) => ({ type, count }));

    // Group by severity
    const severityGroups = alertsData.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const by_severity = Object.entries(severityGroups).map(([severity, count]) => ({ severity, count }));

    setStats({
      total,
      active,
      critical,
      resolved_today,
      by_type,
      by_severity
    });
  };

  const createAlert = useCallback(async (
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ) => {
    try {
      const alertData = {
        type,
        severity,
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {},
        status: 'active' as const,
        auto_dismiss_at: severity === 'low' ? 
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : // Auto-dismiss low severity after 24h
          undefined
      };

      // Store as audit log until admin_alerts table types are available
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: `${type}_${severity}_alert`,
          entity_type: entityType || 'system',
          entity_id: entityId,
          metadata: { ...metadata, title, message, alert_type: type, severity }
        }])
        .select()
        .single();

      if (error) throw error;

      // Notify admins for high/critical alerts
      if (severity === 'high' || severity === 'critical') {
        await notifyAdmins(title, message, severity, type);
      }

      // Refresh alerts
      fetchAlerts();

      return data;

    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }, [fetchAlerts]);

  const notifyAdmins = async (alertTitle: string, alertMessage: string, severity: string, type: string) => {
    try {
      // Get all admin users
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminUsers) {
        // Create notifications for each admin
        for (const admin of adminUsers) {
          await createNotification(
            admin.user_id,
            `🚨 ${severity.toUpperCase()}: ${alertTitle}`,
            alertMessage,
            'warning',
            {
              severity: severity,
              type: type
            }
          );
        }
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Update audit log to mark as acknowledged
      const { error } = await supabase
        .from('audit_logs')
        .update({
          metadata: { 
            acknowledged: true, 
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user.user.id 
          }
        })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'acknowledged' as const, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );

    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  };

  const resolveAlert = async (alertId: string, resolution?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Update audit log to mark as resolved
      const { error } = await supabase
        .from('audit_logs')
        .update({
          metadata: { 
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: user.user.id,
            resolution,
            resolved_by_name: 'Admin User'
          }
        })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { 
                ...alert, 
                status: 'resolved' as const, 
                resolved_at: new Date().toISOString(),
                metadata: { ...alert.metadata, resolution }
              }
            : alert
        )
      );

      fetchAlerts(); // Refresh stats

    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      // Update audit log to mark as dismissed
      const { error } = await supabase
        .from('audit_logs')
        .update({ 
          metadata: { 
            dismissed: true, 
            dismissed_at: new Date().toISOString() 
          } 
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'dismissed' as const }
            : alert
        )
      );

    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  };

  // Check for conditions that should trigger alerts
  const checkAlertConditions = useCallback(async () => {
    try {
      // Check for high-risk KYC documents
      const { data: highRiskKyc } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (highRiskKyc && highRiskKyc.length > 10) {
        await createAlert(
          'compliance',
          'high',
          'High Volume of Unverified KYC Documents',
          `${highRiskKyc.length} KYC documents are pending verification`,
          'kyc_documents',
          undefined,
          { count: highRiskKyc.length }
        );
      }

      // Check for suspicious payment patterns
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', yesterday)
        .gt('amount', 10000);

      if (recentPayments && recentPayments.length > 5) {
        await createAlert(
          'fraud',
          'medium',
          'High-Value Payment Pattern Detected',
          `${recentPayments.length} payments over R$ 10,000 in the last 24 hours`,
          'payments',
          undefined,
          { count: recentPayments.length, threshold: 10000 }
        );
      }

      // Check for system errors
      const { count: errorCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday)
        .ilike('action', '%error%');

      if ((errorCount || 0) > 50) {
        await createAlert(
          'system',
          'high',
          'High Error Rate Detected',
          `${errorCount} system errors logged in the last 24 hours`,
          'system',
          undefined,
          { error_count: errorCount }
        );
      }

    } catch (error) {
      console.error('Error checking alert conditions:', error);
    }
  }, [createAlert]);

  useEffect(() => {
    fetchAlerts();
    
    // Check for alert conditions every 5 minutes
    const interval = setInterval(checkAlertConditions, 5 * 60 * 1000);

    // Set up real-time subscription for audit logs
    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, checkAlertConditions]);

  return {
    alerts,
    rules,
    stats,
    loading,
    error,
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    refetch: fetchAlerts
  };
};