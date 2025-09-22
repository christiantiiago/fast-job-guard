import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Map, 
  List, 
  Search, 
  Loader2,
  AlertTriangle,
  Eye,
  MessageSquare,
  MapPin,
  Clock
} from 'lucide-react';
import { useGeolocation, calculateRouteDistance, formatDistance, formatDuration } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { DiscoverMap } from '@/components/discover/DiscoverMap';

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
  service_categories?: {
    name: string;
    color?: string;
    icon_name?: string;
  };
  addresses?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  distance?: number;
  proposal_count?: number;
  routeDistance?: number;
  routeDuration?: number;
}

export default function Discover() {
  const { loading } = useJobs();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jobsWithDistance, setJobsWithDistance] = useState<JobWithDistance[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('[MAPBOX] Error:', error);
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('[MAPBOX] Exception:', error);
      }
    };

    getMapboxToken();
  }, []);
  useEffect(() => {
    const fetchJobsWithProposals = async () => {
      try {
        const { data: allJobs, error } = await supabase
          .from('jobs')
          .select('*, service_categories(name, icon_name), addresses(street, city, state, neighborhood), proposals(id, price, message, status, provider_id)')
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('[JOBS] Error fetching:', error);
          return;
        }

        if (allJobs) {
          // Process jobs with proposal counts
          const processedJobs = allJobs.map(job => ({
            ...job,
            proposal_count: job.proposals?.filter(p => p.status === 'sent').length || 0
          }));
          
          setJobsWithDistance(processedJobs as JobWithDistance[]);
        }
      } catch (error) {
        console.error('[JOBS] Error fetching:', error);
      }
    };

    fetchJobsWithProposals();
  }, []); // Empty dependency array to prevent infinite loop

  // Calculate route distances when position changes
  useEffect(() => {
    if (!jobsWithDistance.length || !position || !mapboxToken) return;

    let isActive = true;
    
    const calculateRoutes = async () => {
      // Only calculate routes for jobs that don't have route distance yet
      const jobsNeedingRoutes = jobsWithDistance.filter(job => 
        job.latitude && job.longitude && !job.routeDistance
      );
      
      if (jobsNeedingRoutes.length === 0) return;

      const updatedJobs = await Promise.all(
        jobsWithDistance.map(async (job) => {
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

      if (isActive) {
        // Sort by route distance
        const sortedJobs = updatedJobs.sort((a, b) => 
          (a.routeDistance || 0) - (b.routeDistance || 0)
        );

        setJobsWithDistance(sortedJobs);
      }
    };

    calculateRoutes();
    
    return () => {
      isActive = false;
    };
  }, [position?.latitude, position?.longitude, mapboxToken, jobsWithDistance.length]); // More specific dependencies

  // Filter jobs based on search and category
  const filteredJobs = jobsWithDistance.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           job.service_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(
    jobsWithDistance
      .map(job => job.service_categories?.name)
      .filter(Boolean)
  )) as string[];

  // Calculate job statistics
  const jobsWithLocation = filteredJobs.filter(job => job.latitude && job.longitude);
  const jobsWithoutLocation = filteredJobs.filter(job => !job.latitude || !job.longitude);
  
  // Find closest job
  const closestJob = jobsWithLocation.length > 0 
    ? jobsWithLocation.reduce((closest, current) => {
        const closestDistance = closest.routeDistance || closest.distance || Infinity;
        const currentDistance = current.routeDistance || current.distance || Infinity;
        return currentDistance < closestDistance ? current : closest;
      })
    : null;

  const formatCurrency = (min?: number, max?: number, final?: number) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });

    if (final) {
      return formatter.format(final);
    } else if (min && max) {
      return `${formatter.format(min)}-${formatter.format(max)}`;
    } else if (min) {
      return `${formatter.format(min)}+`;
    }
    return 'A combinar';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (geoLoading || loading) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              Carregando trabalhos próximos...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (geoError) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Localização necessária:</strong> {geoError}
              <br />
              Por favor, permita o acesso à sua localização para ver os trabalhos próximos.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showKYCBanner={false}>
      <div className="flex flex-col h-full pb-24">
        {/* Header */}
        <div className="bg-background border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Descobrir Jobs</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="w-4 h-4 mr-2" />
                Mapa
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
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
            jobsWithLocation={jobsWithLocation.length}
            jobsWithoutLocation={jobsWithoutLocation.length}
            closestJob={closestJob}
            formatDistance={formatDistance}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <DiscoverMap
              jobs={jobsWithLocation}
              position={position}
              formatDistance={formatDistance}
              formatDuration={formatDuration}
            />
          ) : (
            /* List View */
            <div className="p-4 space-y-4 overflow-y-auto">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhum trabalho encontrado</h3>
                    <p>Tente ajustar seus filtros de busca</p>
                  </div>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{job.title}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          {job.proposal_count && job.proposal_count > 0 && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {job.proposal_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold text-lg text-primary">
                              {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
                            </div>
                            {job.routeDistance && (
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {formatDistance(job.routeDistance)}
                                </div>
                                {job.routeDuration && job.routeDuration > 0 && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDuration(job.routeDuration)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            disabled={job.status !== 'open'}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {job.status === 'in_progress' ? 'Em Andamento' : 'Propor'}
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