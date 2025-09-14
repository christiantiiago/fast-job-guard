import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DirectProposal {
  id: string;
  title: string;
  description: string;
  proposed_price: number;
  estimated_hours?: number;
  deadline?: string;
  client_message?: string;
  provider_response?: string;
  status: string;  // Changed to string to match database
  created_at: string;
  updated_at: string;
  client_id: string;
  provider_id: string;
  client_profile?: {
    full_name?: string;  // Made optional
    avatar_url?: string;
  } | null;
  provider_profile?: {
    full_name?: string;  // Made optional
    avatar_url?: string;
  } | null;
}

export const useDirectProposals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<DirectProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProposals();
    }
  }, [user]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('direct_proposals')
        .select(`
          *,
          client_profile:profiles!direct_proposals_client_id_fkey(full_name, avatar_url),
          provider_profile:profiles!direct_proposals_provider_id_fkey(full_name, avatar_url)
        `)
        .or(`client_id.eq.${user?.id},provider_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching direct proposals:', error);
        return;
      }

      setProposals((data || []) as DirectProposal[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptProposal = async (proposalId: string) => {
    try {
      // Update proposal status to waiting_client_approval
      const { error: updateError } = await supabase
        .from('direct_proposals')
        .update({ status: 'waiting_client_approval' })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      // Get proposal details for notification
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return false;

      // Send notification to client with detailed info
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: proposal.client_id,
          type: 'direct_proposal_accepted',
          title: 'Prestador Aceitou sua Proposta!',
          message: `${proposal.provider_profile?.full_name || 'Prestador'} aceitou sua proposta "${proposal.title}". Revise e confirme para prosseguir com o pagamento.`,
          data: {
            proposal_id: proposalId,
            provider_id: proposal.provider_id,
            provider_name: proposal.provider_profile?.full_name || 'Prestador',
            provider_avatar: proposal.provider_profile?.avatar_url,
            title: proposal.title,
            proposed_price: proposal.proposed_price,
            estimated_hours: proposal.estimated_hours,
            deadline: proposal.deadline,
            action_url: `/direct-proposals/${proposalId}/checkout`
          }
        }]);

      if (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      toast({
        title: "Proposta aceita!",
        description: "O cliente foi notificado e deve confirmar para prosseguir com o pagamento.",
      });

      await fetchProposals();
      return true;
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a proposta.",
        variant: "destructive",
      });
      return false;
    }
  };

  const rejectProposal = async (proposalId: string, reason?: string) => {
    try {
      // Update proposal status to rejected
      const { error: updateError } = await supabase
        .from('direct_proposals')
        .update({ 
          status: 'rejected',
          provider_response: reason 
        })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      // Get proposal details
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return false;

      // Block provider from sending new proposals for 2 hours
      const blockUntil = new Date();
      blockUntil.setHours(blockUntil.getHours() + 2);

      // Create rejection record
      const { error: rejectionError } = await supabase
        .from('proposal_rejections')
        .insert([{
          provider_id: proposal.provider_id,
          job_id: proposalId, // Using proposal ID as reference
          can_propose_again_at: blockUntil.toISOString()
        }]);

      if (rejectionError) {
        console.error('Error creating rejection record:', rejectionError);
      }

      // Send notification to provider
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: proposal.provider_id,
          type: 'direct_proposal_rejected',
          title: 'Proposta Rejeitada',
          message: `Sua proposta direta foi rejeitada. Você poderá enviar novas propostas em 2 horas.`,
          data: {
            proposal_id: proposalId,
            client_name: proposal.client_profile?.full_name,
            title: proposal.title,
            reason: reason,
            blocked_until: blockUntil.toISOString()
          }
        }]);

      if (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      toast({
        title: "Proposta rejeitada",
        description: "A proposta foi rejeitada. O prestador foi bloqueado por 2 horas.",
      });

      await fetchProposals();
      return true;
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a proposta.",
        variant: "destructive",
      });
      return false;
    }
  };

  const approveAndCheckout = async (proposalId: string) => {
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return { success: false };

      // Redirect to checkout with proposal data
      return { 
        success: true, 
        checkoutData: {
          proposalId,
          providerId: proposal.provider_id,
          providerName: proposal.provider_profile?.full_name || 'Prestador',
          providerAvatar: proposal.provider_profile?.avatar_url,
          title: proposal.title,
          description: proposal.description,
          price: proposal.proposed_price,
          estimatedHours: proposal.estimated_hours,
          deadline: proposal.deadline
        }
      };
    } catch (error) {
      console.error('Error preparing checkout:', error);
      toast({
        title: "Erro",
        description: "Não foi possível prosseguir com o pagamento.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const confirmStart = async (proposalId: string) => {
    try {
      // Create a new job based on the direct proposal
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return false;

      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([{
          title: proposal.title,
          description: proposal.description,
          client_id: proposal.client_id,
          provider_id: proposal.provider_id,
          final_price: proposal.proposed_price,
          status: 'in_progress',
          category_id: '00000000-0000-0000-0000-000000000000' // Default category, should be updated
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      // Update direct proposal status
      const { error: updateError } = await supabase
        .from('direct_proposals')
        .update({ status: 'confirmed' })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      // Send notification to provider
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: proposal.provider_id,
          type: 'job_started',
          title: 'Trabalho Iniciado!',
          message: `O trabalho "${proposal.title}" foi iniciado. Você pode começar a trabalhar.`,
          data: {
            job_id: newJob.id,
            proposal_id: proposalId,
            client_name: proposal.client_profile?.full_name,
            title: proposal.title
          }
        }]);

      if (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      toast({
        title: "Trabalho iniciado!",
        description: "O trabalho foi iniciado com sucesso. O prestador foi notificado.",
      });

      await fetchProposals();
      return true;
    } catch (error) {
      console.error('Error confirming start:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o trabalho.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    proposals,
    loading,
    fetchProposals,
    acceptProposal,
    rejectProposal,
    approveAndCheckout,
    confirmStart
  };
};