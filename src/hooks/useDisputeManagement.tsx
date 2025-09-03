import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DisputeWithDetails {
  id: string;
  job_id: string;
  opened_by_user_id: string;
  reason: string;
  description: string;
  status: string;
  evidence_urls?: string[];
  admin_notes?: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  user_name?: string;
  job_title?: string;
  job_value?: number;
  priority?: string;
  job_details?: any;
  comments?: Array<{
    id: string;
    content: string;
    author_name: string;
    author_avatar?: string;
    created_at: string;
  }>;
}

export interface DisputeStats {
  open: number;
  inReview: number;
  escalated: number;
  resolved: number;
  avgResolutionTime: number;
}

export const useDisputeManagement = () => {
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    open: 0,
    inReview: 0,
    escalated: 0,
    resolved: 0,
    avgResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = async () => {
    try {
      setLoading(true);

      // Fetch disputes with related data
      const { data: disputesData, error: disputesError } = await supabase
        .from('disputes')
        .select(`
          *,
          jobs!inner(
            title,
            final_price,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (disputesError) throw disputesError;

      // Fetch user profiles for dispute openers
      const userIds = disputesData?.map(d => d.opened_by_user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Process disputes data
      const processedDisputes: DisputeWithDetails[] = disputesData?.map(dispute => {
        const userProfile = profiles?.find(p => p.user_id === dispute.opened_by_user_id);
        const job = Array.isArray(dispute.jobs) ? dispute.jobs[0] : dispute.jobs;
        
        return {
          ...dispute,
          user_name: userProfile?.full_name || 'Usuário não encontrado',
          job_title: job?.title || 'Job removido',
          job_value: job?.final_price || 0,
          job_details: job,
          priority: calculatePriority(dispute, job),
          comments: [] // Will be loaded when dispute is opened
        };
      }) || [];

      setDisputes(processedDisputes);

      // Calculate stats
      const statsData = calculateStats(processedDisputes);
      setStats(statsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar disputas');
    } finally {
      setLoading(false);
    }
  };

  const calculatePriority = (dispute: any, job: any) => {
    // Logic to determine priority based on various factors
    const factors = {
      jobValue: job?.final_price || 0,
      daysSinceCreated: Math.floor((Date.now() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      reasonType: dispute.reason
    };

    if (factors.jobValue > 1000 || factors.daysSinceCreated > 7) return 'critical';
    if (factors.jobValue > 500 || factors.daysSinceCreated > 3) return 'high';
    if (factors.jobValue > 100 || factors.daysSinceCreated > 1) return 'medium';
    return 'low';
  };

  const calculateStats = (disputes: DisputeWithDetails[]): DisputeStats => {
    const stats = {
      open: disputes.filter(d => d.status === 'open').length,
      inReview: disputes.filter(d => d.status === 'in_review').length,
      escalated: disputes.filter(d => d.status === 'escalated').length,
      resolved: disputes.filter(d => d.status === 'resolved').length,
      avgResolutionTime: 0
    };

    // Calculate average resolution time for resolved disputes
    const resolvedDisputes = disputes.filter(d => d.status === 'resolved' && d.resolved_at);
    if (resolvedDisputes.length > 0) {
      const totalTime = resolvedDisputes.reduce((sum, dispute) => {
        const created = new Date(dispute.created_at).getTime();
        const resolved = new Date(dispute.resolved_at!).getTime();
        return sum + (resolved - created);
      }, 0);
      
      stats.avgResolutionTime = Math.round(totalTime / (resolvedDisputes.length * 1000 * 60 * 60)); // Convert to hours
    }

    return stats;
  };

  const resolveDispute = async (disputeId: string, resolutionNotes: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved_refund' as const,
          resolution_notes: resolutionNotes,
          resolved_by: currentUser.data.user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', disputeId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'dispute_resolved',
          entity_type: 'dispute',
          entity_id: disputeId,
          metadata: { resolution_notes: resolutionNotes }
        });

      await fetchDisputes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao resolver disputa');
    }
  };

  const escalateDispute = async (disputeId: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'escalated' as any,
          admin_notes: 'Dispute escalated for senior review'
        })
        .eq('id', disputeId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'dispute_escalated',
          entity_type: 'dispute',
          entity_id: disputeId,
          metadata: { escalated_at: new Date().toISOString() }
        });

      await fetchDisputes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao escalar disputa');
    }
  };

  const updateStatus = async (disputeId: string, newStatus: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('disputes')
        .update({ status: newStatus as any })
        .eq('id', disputeId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'dispute_status_changed',
          entity_type: 'dispute',
          entity_id: disputeId,
          metadata: { new_status: newStatus }
        });

      await fetchDisputes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  };

  const addComment = async (disputeId: string, content: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      // In a real implementation, you'd have a dispute_comments table
      // For now, we'll just log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'dispute_comment_added',
          entity_type: 'dispute',
          entity_id: disputeId,
          metadata: { 
            comment: content,
            timestamp: new Date().toISOString()
          }
        });

      // Update the dispute with admin notes
      const { error } = await supabase
        .from('disputes')
        .update({
          admin_notes: `${new Date().toLocaleString('pt-BR')}: ${content}`
        })
        .eq('id', disputeId);

      if (error) throw error;

      await fetchDisputes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar comentário');
    }
  };

  useEffect(() => {
    fetchDisputes();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-disputes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disputes' },
        () => {
          fetchDisputes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    disputes,
    stats,
    loading,
    error,
    refetch: fetchDisputes,
    resolveDispute,
    escalateDispute,
    updateStatus,
    addComment
  };
};