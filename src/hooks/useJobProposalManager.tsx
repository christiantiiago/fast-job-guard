import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ProposalLock {
  id: string;
  user_id: string;
  job_id: string;
  proposal_id?: string;
  locked_until: string;
  can_withdraw: boolean;
  created_at: string;
}

export const useJobProposalManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeLocks, setActiveLocks] = useState<ProposalLock[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificar se o usuário tem alguma proposta ativa que bloqueie novas propostas
  const checkActiveProposals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Buscar propostas pendentes do usuário
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select(`
          id,
          job_id,
          status,
          created_at,
          jobs (id, title, status, client_id)
        `)
        .eq('provider_id', user.id)
        .in('status', ['sent', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking active proposals:', error);
        return;
      }

      // Criar locks virtuais baseados nas propostas ativas
      const locks: ProposalLock[] = proposals?.map(proposal => ({
        id: proposal.id,
        user_id: user.id,
        job_id: proposal.job_id,
        proposal_id: proposal.id,
        locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        can_withdraw: proposal.status === 'sent',
        created_at: proposal.created_at
      })) || [];

      setActiveLocks(locks);
    } catch (error) {
      console.error('Error in checkActiveProposals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se pode fazer proposta para um job específico
  const canProposeToJob = (jobId: string): { canPropose: boolean; reason?: string } => {
    // Verificar se já tem proposta ativa para este job
    const existingLock = activeLocks.find(lock => 
      lock.job_id === jobId && new Date(lock.locked_until) > new Date()
    );

    if (existingLock) {
      return {
        canPropose: false,
        reason: 'Você já tem uma proposta ativa para este trabalho. Aguarde a resposta do cliente ou cancele a proposta atual.'
      };
    }

    // Verificar se tem outras propostas ativas (limite de propostas simultâneas)
    const activeLocksCount = activeLocks.filter(lock => 
      new Date(lock.locked_until) > new Date()
    ).length;

    if (activeLocksCount >= 3) { // Máximo 3 propostas simultâneas
      return {
        canPropose: false,
        reason: 'Você atingiu o limite de 3 propostas simultâneas. Aguarde a resposta dos clientes ou cancele uma proposta.'
      };
    }

    return { canPropose: true };
  };

  // Cancelar/retirar uma proposta
  const withdrawProposal = async (proposalId: string, reason?: string) => {
    try {
      // Atualizar status da proposta
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'withdrawn',
          notes: reason || 'Proposta retirada pelo prestador'
        })
        .eq('id', proposalId)
        .eq('provider_id', user?.id); // Segurança adicional

      if (error) throw error;

      // Buscar dados da proposta para notificar o cliente
      const { data: proposalData } = await supabase
        .from('proposals')
        .select(`
          job_id,
          price,
          jobs (title, client_id)
        `)
        .eq('id', proposalId)
        .single();

      if (proposalData) {
        // Enviar notificação para o cliente
        await supabase
          .from('real_time_notifications')
          .insert({
            user_id: proposalData.jobs?.client_id,
            type: 'proposal_withdrawn',
            title: 'Proposta Cancelada',
            message: `Uma proposta foi retirada para o trabalho "${proposalData.jobs?.title}".`,
            data: { 
              jobId: proposalData.job_id, 
              proposalId: proposalId,
              reason: reason 
            },
            priority: 2
          });
      }

      toast({
        title: "Proposta retirada",
        description: "Sua proposta foi cancelada com sucesso.",
      });

      // Atualizar locks locais
      await checkActiveProposals();

      return true;
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a proposta.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Cliente rejeitar proposta
  const rejectProposal = async (proposalId: string, reason?: string) => {
    try {
      // Atualizar status da proposta
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'rejected',
          notes: reason || 'Proposta rejeitada pelo cliente'
        })
        .eq('id', proposalId);

      if (error) throw error;

      // Buscar dados da proposta para notificar o prestador
      const { data: proposalData } = await supabase
        .from('proposals')
        .select(`
          provider_id,
          job_id,
          price,
          jobs (title)
        `)
        .eq('id', proposalId)
        .single();

      if (proposalData) {
        // Registrar rejeição para cooldown
        await supabase
          .from('proposal_rejections')
          .upsert({
            job_id: proposalData.job_id,
            provider_id: proposalData.provider_id,
            rejected_at: new Date().toISOString(),
            can_propose_again_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 horas
          });

        // Enviar notificação para o prestador
        await supabase
          .from('real_time_notifications')
          .insert({
            user_id: proposalData.provider_id,
            type: 'proposal_rejected',
            title: 'Proposta Rejeitada',
            message: `Sua proposta para "${proposalData.jobs?.title}" foi rejeitada. Você poderá fazer nova proposta em 2 horas.`,
            data: { 
              jobId: proposalData.job_id, 
              proposalId: proposalId,
              reason: reason,
              cooldownHours: 2
            },
            priority: 2
          });
      }

      toast({
        title: "Proposta rejeitada",
        description: "A proposta foi rejeitada e o prestador foi notificado.",
      });

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

  // Cliente cancelar trabalho
  const cancelJob = async (jobId: string, reason?: string) => {
    try {
      // Verificar se pode cancelar (não pode ter pagamento em andamento)
      const { data: escrowData } = await supabase
        .from('escrow_payments')
        .select('status')
        .eq('job_id', jobId)
        .in('status', ['pending', 'held'])
        .maybeSingle();

      if (escrowData) {
        toast({
          title: "Cancelamento não permitido",
          description: "Não é possível cancelar um trabalho com pagamento em andamento.",
          variant: "destructive",
        });
        return false;
      }

      // Atualizar status do job
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'cancelled',
          requirements: reason ? `CANCELADO: ${reason}` : 'CANCELADO'
        })
        .eq('id', jobId);

      if (error) throw error;

      // Buscar dados do job
      const { data: jobData } = await supabase
        .from('jobs')
        .select(`
          title,
          provider_id,
          proposals (provider_id)
        `)
        .eq('id', jobId)
        .single();

      if (jobData) {
        // Notificar prestador atual (se houver)
        if (jobData.provider_id) {
          await supabase
            .from('real_time_notifications')
            .insert({
              user_id: jobData.provider_id,
              type: 'job_cancelled',
              title: 'Trabalho Cancelado',
              message: `O trabalho "${jobData.title}" foi cancelado pelo cliente.`,
              data: { 
                jobId: jobId,
                reason: reason
              },
              priority: 3
            });
        }

        // Notificar todos os prestadores com propostas
        const providerIds = jobData.proposals?.map(p => p.provider_id) || [];
        const uniqueProviderIds = [...new Set(providerIds)].filter(id => id !== jobData.provider_id);
        
        for (const providerId of uniqueProviderIds) {
          await supabase
            .from('real_time_notifications')
            .insert({
              user_id: providerId,
              type: 'job_cancelled',
              title: 'Trabalho Cancelado',
              message: `O trabalho "${jobData.title}" onde você tinha uma proposta foi cancelado.`,
              data: { 
                jobId: jobId,
                reason: reason
              },
              priority: 2
            });
        }
      }

      toast({
        title: "Trabalho cancelado",
        description: "O trabalho foi cancelado e todos os interessados foram notificados.",
      });

      return true;
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o trabalho.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    checkActiveProposals();
  }, [user]);

  return {
    activeLocks,
    loading,
    canProposeToJob,
    withdrawProposal,
    rejectProposal,
    cancelJob,
    refreshLocks: checkActiveProposals
  };
};