import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Review {
  id: string;
  job_id: string;
  author_id: string;
  target_id: string;
  rating: number;
  comment: string;
  created_at: string;
  published_at: string;
  status: 'pending' | 'published';
  is_anonymous: boolean;
  job_title?: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface JobToReview {
  id: string;
  title: string;
  client_id: string;
  provider_id: string;
  client_name?: string;
  provider_name?: string;
  completed_at?: string;
}

export const useReviews = (targetUserId?: string) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    }
  });

  const fetchReviews = async () => {
    const userId = targetUserId || user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar reviews publicadas do usuário
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          job_id,
          author_id,
          target_id,
          rating,
          comment,
          created_at,
          published_at,
          status,
          is_anonymous,
          jobs(title)
        `)
        .eq('target_id', userId)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      // Buscar dados dos autores separadamente
      const authorIds = [...new Set((reviewsData || []).map(r => r.author_id))];
      let authorsData: any[] = [];
      
      if (authorIds.length > 0) {
        const { data: authors } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', authorIds);
        authorsData = authors || [];
      }

      const formattedReviews: Review[] = (reviewsData || []).map(review => {
        const author = authorsData.find(a => a.user_id === review.author_id);
        return {
          id: review.id,
          job_id: review.job_id,
          author_id: review.author_id,
          target_id: review.target_id,
          rating: review.rating,
          comment: review.comment || '',
          created_at: review.created_at,
          published_at: review.published_at,
          status: review.status as 'pending' | 'published',
          is_anonymous: review.is_anonymous,
          job_title: review.jobs?.title,
          reviewer_name: review.is_anonymous ? 'Usuário Anônimo' : author?.full_name,
          reviewer_avatar: review.is_anonymous ? null : author?.avatar_url
        };
      });

      setReviews(formattedReviews);

      // Calculate stats apenas com reviews publicadas
      if (formattedReviews.length > 0) {
        const totalRating = formattedReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / formattedReviews.length;
        
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        formattedReviews.forEach(review => {
          distribution[review.rating as keyof typeof distribution]++;
        });

        setStats({
          averageRating,
          totalReviews: formattedReviews.length,
          ratingDistribution: distribution
        });
      } else {
        setStats({
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
      }
    } catch (error) {
      console.error('Error in fetchReviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar jobs que podem ser avaliados
  const fetchJobsToReview = async () => {
    if (!user?.id) return [];

    try {
      const { data: completedJobs, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          client_id,
          provider_id,
          created_at
        `)
        .eq('status', 'completed')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs to review:', error);
        return [];
      }

      // Buscar dados dos perfis separadamente
      const userIds = [...new Set((completedJobs || []).flatMap(j => [j.client_id, j.provider_id]))];
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profiles = profilesData || [];
      }

      // Filtrar jobs que ainda não foram avaliados pelo usuário atual
      const jobsToReview: JobToReview[] = [];
      
      for (const job of completedJobs || []) {
        const targetUserId = user.id === job.client_id ? job.provider_id : job.client_id;
        
        // Verificar se já foi avaliado
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('job_id', job.id)
          .eq('author_id', user.id)
          .eq('target_id', targetUserId)
          .single();

        if (!existingReview) {
          const clientProfile = profiles.find(p => p.user_id === job.client_id);
          const providerProfile = profiles.find(p => p.user_id === job.provider_id);
          
          jobsToReview.push({
            id: job.id,
            title: job.title,
            client_id: job.client_id,
            provider_id: job.provider_id,
            client_name: clientProfile?.full_name,
            provider_name: providerProfile?.full_name
          });
        }
      }

      return jobsToReview;
    } catch (error) {
      console.error('Error fetching jobs to review:', error);
      return [];
    }
  };

  // Função para submeter uma nova avaliação
  const submitReview = async (jobId: string, targetUserId: string, rating: number, comment: string, isAnonymous: boolean = false) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          job_id: jobId,
          author_id: user.id,
          target_id: targetUserId,
          rating,
          comment: comment.trim() || null,
          is_anonymous: isAnonymous,
          status: 'pending',
          published_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
        });

      if (error) {
        throw error;
      }

      // Criar notificação para o usuário que foi avaliado (sem mostrar conteúdo)
      await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'review_submitted',
          title: 'Nova Avaliação Recebida',
          message: 'Você recebeu uma nova avaliação que será publicada em 7 dias.',
          data: {
            job_id: jobId,
            anonymous: isAnonymous
          }
        });

      return { success: true };
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user, targetUserId]);

  return {
    reviews,
    stats,
    loading,
    refetch: fetchReviews,
    fetchJobsToReview,
    submitReview
  };
};