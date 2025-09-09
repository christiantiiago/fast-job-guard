import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useProposalCooldown = (jobId: string) => {
  const { user } = useAuth();
  const [canPropose, setCanPropose] = useState(true);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !jobId) {
      setLoading(false);
      return;
    }

    checkCooldownStatus();
  }, [user, jobId]);

  const checkCooldownStatus = async () => {
    if (!user) return;

    try {
      // Verificar se há função disponível no banco
      const { data, error } = await supabase.rpc('can_provider_propose', {
        provider_user_id: user.id,
        job_uuid: jobId
      });

      if (error) {
        console.error('Error checking cooldown:', error);
        setCanPropose(true); // Em caso de erro, permitir proposta
        return;
      }

      setCanPropose(data);

      // Se não pode propor, buscar data de liberação
      if (!data) {
        const { data: rejectionData } = await supabase
          .from('proposal_rejections')
          .select('can_propose_again_at')
          .eq('job_id', jobId)
          .eq('provider_id', user.id)
          .single();

        if (rejectionData) {
          setCooldownEnd(new Date(rejectionData.can_propose_again_at));
        }
      }
    } catch (error) {
      console.error('Error in checkCooldownStatus:', error);
      setCanPropose(true);
    } finally {
      setLoading(false);
    }
  };

  const recordRejection = async () => {
    if (!user) return;

    try {
      await supabase
        .from('proposal_rejections')
        .upsert({
          job_id: jobId,
          provider_id: user.id,
          rejected_at: new Date().toISOString(),
          can_propose_again_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 horas
        });

      setCanPropose(false);
      setCooldownEnd(new Date(Date.now() + 2 * 60 * 60 * 1000));
    } catch (error) {
      console.error('Error recording rejection:', error);
    }
  };

  const getCooldownTimeRemaining = () => {
    if (!cooldownEnd) return null;
    
    const now = new Date();
    const timeLeft = cooldownEnd.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      setCanPropose(true);
      setCooldownEnd(null);
      return null;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  return {
    canPropose,
    cooldownEnd,
    loading,
    recordRejection,
    getCooldownTimeRemaining,
    refreshCooldown: checkCooldownStatus
  };
};