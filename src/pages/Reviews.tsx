import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare, Award, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types - usando a estrutura real da tabela reviews
interface Review {
  id: string;
  job_id: string;
  author_id: string;
  target_id: string;
  rating: number;
  comment: string;
  is_public: boolean;
  created_at: string;
  job?: {
    title: string;
  };
  author?: {
    full_name: string;
    avatar_url: string;
  };
  target?: {
    full_name: string;
    avatar_url: string;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

interface JobToReview {
  id: string;
  title: string;
  client_id: string;
  provider_id: string;
}

export default function Reviews() {
  const { user } = useAuth();
  const [reviewsReceived, setReviewsReceived] = useState<Review[]>([]);
  const [reviewsSent, setReviewsSent] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 5.0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [jobsToReview, setJobsToReview] = useState<JobToReview[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobToReview | null>(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch reviews received (where I am the target)
      const { data: reviewsReceivedData, error: receivedError } = await supabase
        .from('reviews')
        .select(`*`)
        .eq('target_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Fetch reviews sent (where I am the author)
      const { data: reviewsSentData, error: sentError } = await supabase
        .from('reviews')
        .select(`*`)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Get all job and profile data separately
      const allJobIds = [...(reviewsReceivedData?.map(r => r.job_id) || []), ...(reviewsSentData?.map(r => r.job_id) || [])];
      const allUserIds = [
        ...(reviewsReceivedData?.map(r => r.author_id) || []),
        ...(reviewsSentData?.map(r => r.target_id) || [])
      ];

      // Fetch jobs data
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title')
        .in('id', allJobIds);

      // Fetch profiles data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', allUserIds);

      // Create maps for easy lookup
      const jobsMap = new Map(jobsData?.map(job => [job.id, job]) || []);
      const profilesMap = new Map(profilesData?.map(profile => [profile.user_id, profile]) || []);

      // Transform reviews with joined data
      const transformedReceivedReviews = reviewsReceivedData?.map(review => ({
        ...review,
        job: jobsMap.get(review.job_id),
        author: profilesMap.get(review.author_id) // author = quem fez a review
      })) || [];

      const transformedSentReviews = reviewsSentData?.map(review => ({
        ...review,
        job: jobsMap.get(review.job_id),
        target: profilesMap.get(review.target_id) // target = quem recebeu a review
      })) || [];

      setReviewsReceived(transformedReceivedReviews);
      setReviewsSent(transformedSentReviews);

      // Calculate stats from received reviews
      const totalReviews = transformedReceivedReviews.length;
      const averageRating = totalReviews > 0 
        ? transformedReceivedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 5.0;

      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      transformedReceivedReviews.forEach(review => {
        ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
      });

      setStats({
        totalReviews,
        averageRating,
        ratingDistribution
      });

      // Fetch completed jobs that can be reviewed
      const { data: completedJobsData } = await supabase
        .from('jobs')
        .select('id, title, client_id, provider_id')
        .eq('status', 'completed')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      if (completedJobsData) {
        // Filter jobs that haven't been reviewed yet by this user
        const reviewedJobIds = new Set([
          ...transformedReceivedReviews.map(r => r.job_id),
          ...transformedSentReviews.map(r => r.job_id)
        ]);

        const jobsToReview = completedJobsData.filter(job => 
          !reviewedJobIds.has(job.id)
        );

        setJobsToReview(jobsToReview);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!selectedJob || !user || submitting) return;

    try {
      setSubmitting(true);
      
      // Determine who is being reviewed
      const targetId = selectedJob.client_id === user.id ? selectedJob.provider_id : selectedJob.client_id;

      const { error } = await supabase
        .from('reviews')
        .insert({
          job_id: selectedJob.id,
          author_id: user.id,
          target_id: targetId,
          rating: newReview.rating,
          comment: newReview.comment.trim() || null,
          is_public: true
        });

      if (error) throw error;

      toast.success('Avaliação enviada com sucesso!');
      setSelectedJob(null);
      setNewReview({ rating: 5, comment: '' });
      await fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message?.includes('duplicate') 
        ? 'Você já avaliou este trabalho' 
        : 'Erro ao enviar avaliação'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRatingChange?.(star)}
            disabled={!interactive}
            className={`${interactive ? 'hover:scale-110 transition-transform cursor-pointer' : 'cursor-default'}`}
          >
            <Star 
              className={`h-5 w-5 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-20" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Avaliações
            </h1>
            <p className="text-muted-foreground">
              Veja suas avaliações e avalie trabalhos concluídos
            </p>
          </div>
          
          {jobsToReview.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Star className="h-4 w-4 mr-2" />
                  Avaliar Trabalho ({jobsToReview.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Avaliar Trabalho</DialogTitle>
                  <DialogDescription>
                    Selecione um trabalho para avaliar
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Select onValueChange={(value) => {
                      const job = jobsToReview.find(j => j.id === value);
                      setSelectedJob(job || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um trabalho" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobsToReview.map(job => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedJob && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Avaliação</label>
                        {renderStars(newReview.rating, true, (rating) => 
                          setNewReview({ ...newReview, rating })
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Comentário (opcional)</label>
                        <Textarea
                          placeholder="Descreva sua experiência..."
                          value={newReview.comment}
                          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                          maxLength={500}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={submitReview}
                          disabled={submitting}
                          className="flex-1"
                        >
                          {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(null);
                            setNewReview({ rating: 5, comment: '' });
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
              <p className="text-xs text-muted-foreground">
                avaliações recebidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nota Média</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {stats.averageRating.toFixed(1)}
                <div className="flex">
                  {renderStars(Math.round(stats.averageRating))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                de {stats.totalReviews || 1} avaliação{stats.totalReviews !== 1 ? 'ões' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distribuição</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(rating => (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star}
                          className={`h-3 w-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground">
                      {stats.ratingDistribution[rating] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews */}
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Recebidas ({reviewsReceived.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Enviadas ({reviewsSent.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4 mt-6">
            {reviewsReceived.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação ainda</h3>
                  <p className="text-muted-foreground text-center">
                    Complete trabalhos para receber suas primeiras avaliações
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviewsReceived.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <UserAvatar 
                          src={review.author?.avatar_url}
                          name={review.author?.full_name}
                          size="lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{review.author?.full_name || 'Usuário'}</h4>
                              <p className="text-sm text-muted-foreground">{review.job?.title}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex gap-1 mb-1">
                                {renderStars(review.rating)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(review.created_at), { 
                                  addSuffix: true,
                                  locale: ptBR 
                                })}
                              </p>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                              "{review.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4 mt-6">
            {reviewsSent.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação enviada</h3>
                  <p className="text-muted-foreground text-center">
                    Avalie trabalhos concluídos para aparecerem aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviewsSent.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <UserAvatar 
                          src={review.target?.avatar_url}
                          name={review.target?.full_name}
                          size="lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{review.target?.full_name || 'Usuário'}</h4>
                              <p className="text-sm text-muted-foreground">{review.job?.title}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex gap-1 mb-1">
                                {renderStars(review.rating)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(review.created_at), { 
                                  addSuffix: true,
                                  locale: ptBR 
                                })}
                              </p>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                              "{review.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}