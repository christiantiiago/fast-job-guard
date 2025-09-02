import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  kyc_status: 'incomplete' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface ProfileStats {
  totalJobs: number;
  completedJobs: number;
  totalEarnings: number;
  averageRating: number;
  reviewCount: number;
  kycStatus: string;
  subscriptionStatus: string;
}

export const useProfile = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch profile data
  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // If no profile exists, create one with auth metadata
      if (!profileData) {
        const newProfile = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.fullName || '',
          phone: user.user_metadata?.phone || '',
          avatar_url: user.user_metadata?.avatar_url || ''
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (!createError && createdProfile) {
          setProfile(createdProfile);
        }
      } else {
        setProfile(profileData);
      }

      // Fetch statistics
      await fetchStats();
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile statistics
  const fetchStats = async () => {
    if (!user) return;

    try {
      let totalJobs = 0;
      let completedJobs = 0;
      let totalEarnings = 0;
      let averageRating = 0;
      let reviewCount = 0;

      if (userRole === 'client') {
        // Get client jobs statistics
        const { data: clientJobs } = await supabase
          .from('jobs')
          .select('status, final_price')
          .eq('client_id', user.id);

        if (clientJobs) {
          totalJobs = clientJobs.length;
          completedJobs = clientJobs.filter(job => job.status === 'completed').length;
        }

        // Get client reviews (reviews received)
        const { data: clientReviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('target_id', user.id);

        if (clientReviews && clientReviews.length > 0) {
          reviewCount = clientReviews.length;
          averageRating = clientReviews.reduce((sum, review) => sum + review.rating, 0) / clientReviews.length;
        }
      } else if (userRole === 'provider') {
        // Get provider jobs statistics
        const { data: providerJobs } = await supabase
          .from('jobs')
          .select('status, final_price')
          .eq('provider_id', user.id);

        if (providerJobs) {
          totalJobs = providerJobs.length;
          completedJobs = providerJobs.filter(job => job.status === 'completed').length;
          totalEarnings = providerJobs
            .filter(job => job.status === 'completed' && job.final_price)
            .reduce((sum, job) => sum + (job.final_price || 0), 0);
        }

        // Get provider reviews
        const { data: providerReviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('target_id', user.id);

        if (providerReviews && providerReviews.length > 0) {
          reviewCount = providerReviews.length;
          averageRating = providerReviews.reduce((sum, review) => sum + review.rating, 0) / providerReviews.length;
        }
      }

      // Get subscription status (mock for now)
      const subscriptionStatus = 'active'; // This would come from subscriptions table
      
      setStats({
        totalJobs,
        completedJobs,
        totalEarnings,
        averageRating,
        reviewCount,
        kycStatus: profile?.kyc_status || 'incomplete',
        subscriptionStatus
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return false;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar o perfil. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao salvar suas informações.",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user, userRole]);

  return {
    profile,
    stats,
    loading,
    updating,
    updateProfile,
    refetch: fetchProfile
  };
};