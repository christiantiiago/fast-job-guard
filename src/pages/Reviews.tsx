import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Star,
  MessageSquare,
  ThumbsUp,
  Award,
  TrendingUp,
  Calendar,
  User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  author_id: string;
  target_id: string;
  job_id: string;
  jobs: {
    title: string;
  };
  author_profile?: {
    full_name?: string;
  };
  target_profile?: {
    full_name?: string;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}

export default function Reviews() {
  const { user, userRole } = useAuth();
  const [reviewsReceived, setReviewsReceived] = useState<Review[]>([]);
  const [reviewsSent, setReviewsSent] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch reviews received
      const { data: receivedData, error: receivedError } = await supabase
        .from('reviews')
        .select(`
          *,
          jobs!inner(title),
          profiles!reviews_author_id_fkey(full_name)
        `)
        .eq('target_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Fetch reviews sent
      const { data: sentData, error: sentError } = await supabase
        .from('reviews')
        .select(`
          *,
          jobs!inner(title),
          profiles!reviews_target_id_fkey(full_name)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      setReviewsReceived(receivedData || []);
      setReviewsSent(sentData || []);

      // Calculate stats from received reviews
      if (receivedData && receivedData.length > 0) {
        const totalReviews = receivedData.length;
        const totalRating = receivedData.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / totalReviews;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        receivedData.forEach(review => {
          distribution[review.rating]++;
        });

        setStats({
          totalReviews,
          averageRating,
          ratingDistribution: distribution
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!selectedJob || !user) return;

    setSubmitting(true);
    try {
      const targetId = selectedJob.client_id === user.id ? selectedJob.provider_id : selectedJob.client_id;

      const { error } = await supabase
        .from('reviews')
        .insert({
          job_id: selectedJob.id,
          author_id: user.id,
          target_id: targetId,
          rating: newReview.rating,
          comment: newReview.comment.trim() || null
        });

      if (error) throw error;

      toast.success('Avaliação enviada com sucesso!');
      setSelectedJob(null);
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => onRatingChange?.(star) : undefined}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  useEffect(() => {
    fetchReviews();
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6" />
            Avaliações
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'client' 
              ? 'Veja suas avaliações de prestadores e avalie trabalhos concluídos'
              : 'Acompanhe sua reputação e feedback de clientes'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliações Recebidas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
              <p className="text-xs text-muted-foreground">
                Total de feedbacks
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center">
                {renderStars(stats.averageRating)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5 Estrelas</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.ratingDistribution[5]}
              </div>
              <p className="text-xs text-muted-foreground">
                Avaliações excelentes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliações Enviadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewsSent.length}</div>
              <p className="text-xs text-muted-foreground">
                Total enviadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        {stats.totalReviews > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Avaliações</CardTitle>
              <CardDescription>
                Como os usuários avaliam seus serviços
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: stats.totalReviews > 0 
                            ? `${(stats.ratingDistribution[rating] / stats.totalReviews) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">
                      {stats.ratingDistribution[rating]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Tabs */}
        <Tabs defaultValue="received" className="space-y-6">
          <TabsList>
            <TabsTrigger value="received">Recebidas ({reviewsReceived.length})</TabsTrigger>
            <TabsTrigger value="sent">Enviadas ({reviewsSent.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {reviewsReceived.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação recebida</h3>
                  <p className="text-muted-foreground">
                    Complete trabalhos para começar a receber avaliações
                  </p>
                </CardContent>
              </Card>
            ) : (
              reviewsReceived.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {review.author_profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {review.author_profile?.full_name || 'Usuário'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {review.jobs.title}
                            </p>
                          </div>
                          <div className="text-right">
                            {renderStars(review.rating)}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(review.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        {review.comment && (
                          <p className="text-sm">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {reviewsSent.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação enviada</h3>
                  <p className="text-muted-foreground">
                    Avalie {userRole === 'client' ? 'prestadores' : 'clientes'} após completar trabalhos
                  </p>
                </CardContent>
              </Card>
            ) : (
              reviewsSent.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {review.target_profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              Para: {review.target_profile?.full_name || 'Usuário'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {review.jobs.title}
                            </p>
                          </div>
                          <div className="text-right">
                            {renderStars(review.rating)}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(review.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        {review.comment && (
                          <p className="text-sm">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}