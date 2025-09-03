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

      // Buscar informações do perfil (incluindo expiração da certidão criminal)
      const { data: profile } = await supabase
        .from('profiles')
        .select('criminal_background_expires_at, kyc_status')
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

      // Verificar se pode usar a plataforma (KYC completo + certidão válida para prestadores)
      let canUsePlatform = isComplete;
      if (userRole === 'provider' && profile?.criminal_background_expires_at) {
        const expiryDate = new Date(profile.criminal_background_expires_at);
        canUsePlatform = isComplete && expiryDate > new Date();
      }

      const kycStatus: KYCStatus = {
        isComplete,
        canUsePlatform,
        requiredDocs,
        completedDocs,
        pendingDocs: [...pendingDocs, ...missingDocs],
        rejectedDocs,
        documents: documents || [],
        criminalBackgroundExpiry: profile?.criminal_background_expires_at,
        kyc_status: profile?.kyc_status || 'incomplete'
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

  useEffect(() => {
    fetchKYCStatus();
  }, [user, userRole]);

  return {
    status,
    loading,
    refreshStatus,
  };
};