import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useProfileVisits } from '@/hooks/useProfileVisits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  MapPin, 
  Star,
  CheckCircle,
  Clock,
  Crown,
  Eye,
  Users,
  Briefcase,
  MessageCircle,
  ChevronRight,
  Calendar
} from 'lucide-react';

interface UserProfileData {
  user_id: string;
  full_name: string;
  avatar_url: string;
  kyc_status: string;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  verified_at: string;
  city?: string;
  state?: string;
}

interface UserJob {
  id: string;
  title: string;
  status: string;
  final_price: number;
  created_at: string;
  category_name: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  job_title: string;
  author_name: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { premiumStatus } = usePremiumStatus();
  const { stats, visitors, recordVisit } = useProfileVisits(userId);
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [jobs, setJobs] = useState<UserJob[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      // Buscar dados do perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          avatar_url,
          kyc_status,
          rating_avg,
          rating_count,
          created_at,
          verified_at
        `)
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Verificar se é premium
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      setIsPremium(!!subscription);

      // Buscar endereço (última cidade conhecida)
      const { data: addressData } = await supabase
        .from('addresses')
        .select('city, state')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      setProfile({
        ...profileData,
        city: addressData?.city,
        state: addressData?.state
      });

      // Registrar visita
      if (currentUser && currentUser.id !== userId) {
        recordVisit(userId);
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchJobs = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          final_price,
          created_at,
          service_categories(name)
        `)
        .eq('provider_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedJobs = (data || []).map(job => ({
        ...job,
        category_name: job.service_categories?.name || 'Categoria não especificada'
      }));

      setJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchReviews = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          author_id,
          jobs!inner(title)
        `)
        .eq('target_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Buscar nomes dos autores separadamente
      const reviewsWithAuthors = await Promise.all(
        (data || []).map(async (review) => {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', review.author_id)
            .single();

          return {
            ...review,
            job_title: review.jobs?.title || 'Trabalho removido',
            author_name: authorData?.full_name || 'Usuário anônimo'
          };
        })
      );

      setReviews(reviewsWithAuthors);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchJobs(),
        fetchReviews()
      ]);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-8">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
          <p className="text-muted-foreground">Este usuário não existe ou foi removido.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header do Perfil */}
        <div className="relative">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile.full_name 
                  ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                {isPremium && <Crown className="h-6 w-6 text-accent" />}
                {profile.kyc_status === 'approved' && (
                  <VerificationBadge 
                    isVerified={true} 
                    verifiedAt={profile.verified_at}
                    size="lg"
                  />
                )}
              </div>
              
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                {profile.city && profile.state && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.city}, {profile.state}</span>
                  </div>
                )}
                
                {profile.rating_avg > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-warning fill-current" />
                    <span className="font-medium">{profile.rating_avg.toFixed(1)}</span>
                    <span>({profile.rating_count} avaliações)</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Desde {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Conversar
                </Button>
                <Button variant="outline">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Contratar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas de Visitas (apenas para o próprio perfil) */}
        {currentUser?.id === userId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visitas ao Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.total_visits}</div>
                  <div className="text-sm text-muted-foreground">Total de visitas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{stats.unique_visitors}</div>
                  <div className="text-sm text-muted-foreground">Visitantes únicos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{stats.recent_visits}</div>
                  <div className="text-sm text-muted-foreground">Últimos 7 dias</div>
                </div>
              </div>
              
              {premiumStatus.is_premium && visitors.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Visitantes Recentes</h4>
                  <div className="space-y-2">
                    {visitors.slice(0, 5).map((visitor) => (
                      <div key={visitor.visitor_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{visitor.visitor_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{visitor.visitor_name || 'Usuário anônimo'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(visitor.visit_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!premiumStatus.is_premium && currentUser?.id === userId && (
                <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-center">
                    <Crown className="h-4 w-4 inline mr-1" />
                    Upgrade para Premium para ver quem visitou seu perfil
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs com Trabalhos e Avaliações */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="jobs">Trabalhos Realizados ({jobs.length})</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum trabalho concluído ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{job.title}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">{job.category_name}</Badge>
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Concluído
                            </Badge>
                            {job.final_price && (
                              <span className="text-sm font-medium text-success">
                                {formatCurrency(job.final_price)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Concluído em {new Date(job.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma avaliação ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating 
                                    ? 'text-warning fill-current' 
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{review.rating}/5</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      
                      <p className="text-sm mb-2">{review.comment}</p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Trabalho: {review.job_title}</span>
                        <span>Por: {review.author_name}</span>
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