import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Dados do usuário (via join)
  user_email?: string;
  user_name?: string;
}

export const useAuditLogs = (limit = 50) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length > 0 ? await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds) : { data: [] };
      
      const logsWithUserInfo = data.map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent as string | null,
        user_name: profiles?.find(p => p.user_id === log.user_id)?.full_name || 'Sistema'
      })) as AuditLog[];

      setLogs(logsWithUserInfo);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createLog = async (logData: {
    action: string;
    entity_type: string;
    entity_id?: string;
    old_values?: any;
    new_values?: any;
    metadata?: any;
  }) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...logData,
          ip_address: '127.0.0.1', // Em produção, pegar IP real
          user_agent: navigator.userAgent
        });

      if (error) throw error;
      
      // Atualizar lista
      fetchLogs();
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  };

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    createLog
  };
};