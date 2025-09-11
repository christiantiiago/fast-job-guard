import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Map, List, Search, Loader2, AlertTriangle, Eye, MessageSquare, MapPin, Clock, Lock
} from 'lucide-react';
import { useGeolocation, calculateRouteDistance, formatDistance, formatDuration } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { DiscoverMap } from '@/components/discover/DiscoverMap';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { useAuth } from '@/hooks/useAuth';

interface JobWithDistance {
  id: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
  created_at: string;
  completed_at?: string;
  service_categories?: { name: string; icon_name?: string };
  addresses?: { neighborhood?: string; city?: string; state?: string };
  distance?: number;
  proposal_count?: number;
  routeDistance?: number;
  routeDuration?: number;
}

export default function Discover() {
  const { userRole } = useAuth();
  const { status: kycStatus, loading: kycLoading } = useKYCStatus();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jobsWithDistance, setJobsWithDistance] = useState<JobWithDistance[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // 🔐 Bloqueio da página até aprovação do KYC
  if (kycLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      </AppLayout>
    );
  }

  if (!kycStatus?.isComplete) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Acesso Restrito</AlertTitle>
            <AlertDescription>
              {userRole === 'provider'
                ? 'Finalize sua verificação de identidade para acessar os trabalhos.'
                : 'Complete a verificação KYC para desbloquear esta página.'}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // 🔑 Buscar token do Mapbox
  useEffect(() => {
    let active = true;
    supabase.functions.invoke('get-mapbox-token').then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('[MAPBOX] Error:', error);
        return;
      }
      if (data?.token) setMapboxToken(data.token);
    });
    return () => {
      active = false;
    };
  }, []);

  // ⚡ Buscar jobs com AbortController
  useEffect(() => {
    const controller = new AbortController();
    const fetchJobs = async () => {
      try {
        const { data: jobs, error } = await supabase
          .from('jobs')
          .select(`
            id, title, description, latitude, longitude, budget_min, budget_max, final_price, status, created_at, completed_at,
            service_categories(name, icon_name),
            addresses(neighborhood, city, state),
            proposals(id, status)
          `)
          .in('status', ['open', 'in_progress', 'completed'])
          .order('created_at', { ascending: false });

        if (controller.signal.aborted) return;
        if (error) {
          console.error('[JOBS] Error fetching:', error);
          return;
        }

        if (jobs) {
          const processedJobs = jobs.map(job => ({
            ...job,
            proposal_count: job.proposals?.filter((p: any) => p.status === 'sent').length || 0
          }));
          setJobsWithDistance(processedJobs as JobWithDistance[]);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[JOBS] Exception:', err);
        }
      }
    };

    fetchJobs();
    return () => controller.abort();
  }, []);

  // 🔄 Filtro de jobs recentes (completed por 2min)
  const filterJobsByTime = useCallback((jobs: JobWithDistance[]) => {
    const now = new Date();
    return jobs.filter(job => {
      if (job.status === 'open' || job.status === 'in_progress') return true;
      if (job.status === 'completed' && job.completed_at) {
        const diff = now.getTime() - new Date(job.completed_at).getTime();
        return diff <= 2 * 60 * 1000;
      }
      return false;
    });
  }, []);

  // 🗺️ Calcular rotas
  useEffect(() => {
    if (!jobsWithDistance.length || !position || !mapboxToken) return;
    let active = true;

    const calculateRoutes = async () => {
      const updatedJobs = await Promise.all(
        jobsWithDistance.map(async job => {
          if (!job.latitude || !job.longitude || job.routeDistance) return job;
          const routeInfo = await calculateRouteDistance(
            position.latitude,
            position.longitude,
            job.latitude,
            job.longitude,
            mapboxToken
          );
          return {
            ...job,
            routeDistance: routeInfo?.distance || job.distance,
            routeDuration: routeInfo?.duration || 0
          };
        })
      );
      if (active) {
        setJobsWithDistance(updatedJobs.sort((a, b) => (a.routeDistance || 0) - (b.routeDistance || 0)));
      }
    };
    calculateRoutes();
    return () => {
      active = false;
    };
  }, [position?.latitude, position?.longitude, mapboxToken, jobsWithDistance.length]);

  // ⏱️ Auto-refresh para completed jobs
  useEffect(() => {
    const interval = setInterval(() => {
      setJobsWithDistance(prev => filterJobsByTime(prev));
    }, 30000);
    return () => clearInterval(interval);
  }, [filterJobsByTime]);

  // 🔍 Filtros
  const filteredJobs = jobsWithDistance.filter(job => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || job.service_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(jobsWithDistance.map(job => job.service_categories?.name).filter(Boolean))) as string[];

  // 💰 Formatação de moeda
  const formatCurrency = (min?: number, max?: number, final?: number) => {
    const f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
    if (final) return f.format(final);
    if (min && max) return `${f.format(min)}-${f.format(max)}`;
    if (min) return `${f.format(min)}+`;
    return 'A combinar';
  };

  // 🎭 Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      open: { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' }
    };
    const s = config[status] || config.open;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  // 🌀 Loading states
  if (geoLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      </AppLayout>
    );
  }

  if (geoError) {
    return (
      <AppLayout>
        <div className="p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{geoError}</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full pb-24">
        {/* Header */}
        <div className="bg-background border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Descobrir Jobs</h1>
            <div className="flex gap-2">
              <Button variant={viewMode === 'map' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('map')}>
                <Map className="w-4 h-4 mr-2" />Mapa
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
                <List className="w-4 h-4 mr-2" />Lista
              </Button>
            </div>
          </div>

          <DiscoverFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
            resultCount={filteredJobs.length}
            jobsWithLocation={filteredJobs.filter(j => j.latitude && j.longitude).length}
            jobsWithoutLocation={filteredJobs.filter(j => !j.latitude || !j.longitude).length}
            closestJob={filteredJobs[0]}
            formatDistance={formatDistance}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <DiscoverMap jobs={filteredJobs.filter(j => j.latitude && j.longitude)} position={position} formatDistance={formatDistance} formatDuration={formatDuration} />
          ) : (
            <div className="p-4 space-y-4 overflow-y-auto">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum trabalho encontrado</h3>
                  <p>Tente ajustar seus filtros de busca</p>
                </div>
              ) : (
                filteredJobs.map(job => (
                  <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{job.title}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          {job.proposal_count ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {job.proposal_count}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-lg text-primary">{formatCurrency(job.budget_min, job.budget_max, job.final_price)}</div>
                          {job.routeDistance && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {formatDistance(job.routeDistance)}
                              </div>
                              {job.routeDuration ? (
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDuration(job.routeDuration)}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${job.id}`)}>
                            <Eye className="w-4 h-4 mr-1" />Ver
                          </Button>
                          <Button size="sm" onClick={() => navigate(`/jobs/${job.id}`)}>
                            <MessageSquare className="w-4 h-4 mr-1" />Propor
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
