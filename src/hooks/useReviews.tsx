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
  job_title?: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
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

      // Mock reviews for now since reviews table doesn't exist yet
      const mockReviews: Review[] = [
        {
          id: '1',
          job_id: 'job1',
          author_id: 'user1',
          target_id: userId,
          rating: 5,
          comment: 'Excelente trabalho! Muito profissional e pontual.',
          created_at: new Date().toISOString(),
          job_title: 'Instalação de Sistema de Segurança',
          reviewer_name: 'João Silva',
          reviewer_avatar: null
        },
        {
          id: '2',
          job_id: 'job2',
          author_id: 'user2',
          target_id: userId,
          rating: 4,
          comment: 'Bom serviço, recomendo!',
          created_at: new Date().toISOString(),
          job_title: 'Manutenção de Rede',
          reviewer_name: 'Maria Santos',
          reviewer_avatar: null
        }
      ];

      setReviews(mockReviews);

      // Calculate stats
      if (mockReviews.length > 0) {
        const totalRating = mockReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / mockReviews.length;
        
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        mockReviews.forEach(review => {
          distribution[review.rating as keyof typeof distribution]++;
        });

        setStats({
          averageRating,
          totalReviews: mockReviews.length,
          ratingDistribution: distribution
        });
      }
    } catch (error) {
      console.error('Error in fetchReviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user, targetUserId]);

  return {
    reviews,
    stats,
    loading,
    refetch: fetchReviews
  };
};