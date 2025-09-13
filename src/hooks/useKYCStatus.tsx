import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface KYCDocument {
  id: string;
  document_type: 'rg' | 'cpf' | 'selfie' | 'address_proof' | 'bank_info' | 'criminal_background';
  is_verified: boolean;
  file_url: string;
  created_at: string;
  verified_at?: string;
  notes?: string;
}

export interface KYCStatus {
  isComplete: boolean;
  canUsePlatform: boolean;
  requiredDocs: string[];
  completedDocs: string[];
  pendingDocs: string[];
  rejectedDocs: string[];
  documents: KYCDocument[];
  criminalBackgroundExpiry?: string;
  kyc_status: 'incomplete' | 'pending' | 'approved' | 'rejected' | 'em_analise' | 'bloqueado' | 'suspeito';
  verifiedAt?: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export const useKYCStatus = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const getRequiredDocs = (role: string | null) => {
    const baseDocs = ['rg', 'selfie', 'address_proof'];
    if (role === 'provider') {
      return [...baseDocs, 'criminal_background'];
    }
    return baseDocs;
  };

  const fetchKYCStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar documentos do usuário
      const { data: documents, error: docsError } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (docsError) {
        throw docsError;
      }

      // Buscar informações do perfil (incluindo expiração da certidão criminal e data de verificação)
      const { data: profile } = await supabase
        .from('profiles')
        .select('criminal_background_expires_at, kyc_status, verified_at')
        .eq('user_id', user.id)
        .single();

      const requiredDocs = getRequiredDocs(userRole);
      const completedDocs = documents
        ?.filter(doc => doc.is_verified)
        .map(doc => doc.document_type) || [];
      
      const pendingDocs = documents
        ?.filter(doc => !doc.is_verified && !doc.notes)
        .map(doc => doc.document_type) || [];
      
      const rejectedDocs = documents
        ?.filter(doc => !doc.is_verified && doc.notes)
        .map(doc => doc.document_type) || [];

      const missingDocs = requiredDocs.filter(doc => 
        !documents?.some(d => d.document_type === doc)
      );

      const isComplete = requiredDocs.every(doc => 
        completedDocs.includes(doc as any)
      );

  // Verificar se pode usar a plataforma
      let canUsePlatform = false;
      
      // Lógica mais rigorosa: todos os documentos devem estar aprovados
      if (isComplete) {
        // Se todos os documentos estão aprovados, pode usar
        canUsePlatform = true;
        
        // Para prestadores, verificar também a certidão criminal
        if (userRole === 'provider' && profile?.criminal_background_expires_at) {
          const expiryDate = new Date(profile.criminal_background_expires_at);
          canUsePlatform = expiryDate > new Date();
        }
        
        // Verificar se não está bloqueado/suspeito
        if (profile?.kyc_status && ['bloqueado', 'suspeito', 'rejected'].includes(profile.kyc_status)) {
          canUsePlatform = false;
        }
      } else {
        // Se nem todos os documentos estão aprovados, bloquear
        canUsePlatform = false;
      }

      // Calcular progresso
      const completedCount = completedDocs.length;
      const totalCount = requiredDocs.length;
      const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      const kycStatus: KYCStatus = {
        isComplete,
        canUsePlatform,
        requiredDocs,
        completedDocs,
        pendingDocs: [...pendingDocs, ...missingDocs],
        rejectedDocs,
        documents: documents || [],
        criminalBackgroundExpiry: profile?.criminal_background_expires_at,
        kyc_status: profile?.kyc_status || 'incomplete',
        verifiedAt: profile?.verified_at,
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage: Math.round(progressPercentage)
        }
      };

      setStatus(kycStatus);
    } catch (error) {
      console.error('Erro ao buscar status do KYC:', error);
      toast({
        title: "Erro ao carregar status do KYC",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = () => {
    fetchKYCStatus();
  };

  // Setup realtime subscription para atualizar quando documentos são aprovados/rejeitados
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('kyc_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kyc_documents',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('KYC document changed:', payload);
          fetchKYCStatus(); // Refresh status quando documentos são alterados
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile changed:', payload);
          fetchKYCStatus(); // Refresh status quando perfil é alterado
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    fetchKYCStatus();
  }, [user, userRole]);

  return {
    status,
    loading,
    refreshStatus,
  };
};