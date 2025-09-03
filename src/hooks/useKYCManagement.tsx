import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface KYCStats {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  avg_processing_time: number;
  pending_documents: KYCDocument[];
}

export const useKYCManagement = () => {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [stats, setStats] = useState<KYCStats>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    avg_processing_time: 0,
    pending_documents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKYCData = async () => {
    try {
      setLoading(true);

      // Get all KYC documents with user info
      const { data: kycDocs, error: kycError } = await supabase
        .from('kyc_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (kycError) throw kycError;

      // Get user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      // Process and combine data
      const processedDocs: KYCDocument[] = kycDocs?.map(doc => {
        const userProfile = profiles?.find(p => p.user_id === doc.user_id);
        return {
          ...doc,
          user_name: userProfile?.full_name || 'Nome não informado',
          user_email: `user_${doc.user_id.slice(0, 8)}@example.com` // Mock email
        };
      }) || [];

      setDocuments(processedDocs);

      // Calculate stats
      const pending = processedDocs.filter(doc => !doc.is_verified && !doc.verified_at);
      const approved = processedDocs.filter(doc => doc.is_verified);
      const rejected = processedDocs.filter(doc => !doc.is_verified && doc.verified_at);

      setStats({
        total_pending: pending.length,
        total_approved: approved.length,
        total_rejected: rejected.length,
        avg_processing_time: 24, // Mock average processing time in hours
        pending_documents: pending
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados KYC');
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async (documentId: string, notes?: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: true,
          verified_by: currentUser.data.user?.id,
          verified_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', documentId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'kyc_approve',
          entity_type: 'kyc_document',
          entity_id: documentId,
          metadata: { notes }
        });

      await fetchKYCData();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao aprovar documento');
    }
  };

  const rejectDocument = async (documentId: string, reason: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: false,
          verified_by: currentUser.data.user?.id,
          verified_at: new Date().toISOString(),
          notes: `REJEITADO: ${reason}`
        })
        .eq('id', documentId);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'kyc_reject',
          entity_type: 'kyc_document',
          entity_id: documentId,
          metadata: { reason }
        });

      await fetchKYCData();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao rejeitar documento');
    }
  };

  const bulkApprove = async (documentIds: string[], notes?: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      for (const docId of documentIds) {
        await approveDocument(docId, notes);
      }

      // Create bulk audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'kyc_bulk_approve',
          entity_type: 'kyc_document',
          metadata: { document_count: documentIds.length, notes }
        });

      await fetchKYCData();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao aprovar documentos em massa');
    }
  };

  useEffect(() => {
    fetchKYCData();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-kyc')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kyc_documents' },
        () => {
          fetchKYCData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    documents,
    stats,
    loading,
    error,
    refetch: fetchKYCData,
    approveDocument,
    rejectDocument,
    bulkApprove
  };
};