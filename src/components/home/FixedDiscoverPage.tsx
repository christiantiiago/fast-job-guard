import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Map, 
  List, 
  Search, 
  Filter, 
  MapPin, 
  Loader2,
  AlertTriangle,
  Eye,
  MessageSquare,
  Navigation,
  Clock
} from 'lucide-react';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

export default function FixedDiscoverPage() {
  const { jobs, loading, error, fetchAllPublicJobs } = useJobs();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jobsWithDistance, setJobsWithDistance] = useState<JobWithDistance[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDistance | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const mapboxglRef = useRef<any>(null);

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        console.log('[MAPBOX] Fetching token...');
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('[MAPBOX] Error:', error);
          setMapboxError('Erro ao carregar token do mapa');
          return;
        }
        
        if (data?.token) {
          console.log('[MAPBOX] ✅ Token received');
          setMapboxToken(data.token);
        } else {
          console.error('[MAPBOX] No token in response');
          setMapboxError('Token não encontrado');
        }
      } catch (error) {
        console.error('[MAPBOX] Exception:', error);
        setMapboxError('Erro de rede');
      }
    };

    getMapboxToken();
  }, []);

  // Fetch jobs and calculate proposal counts - otimizado para evitar loops
  useEffect(() => {
    const fetchJobsWithProposals = async () => {
      try {
        await fetchAllPublicJobs();
        
        // Get proposal counts for each job
        const { data: proposalCounts, error } = await supabase
          .from('proposals')
          .select('job_id')
          .eq('status', 'sent');
          
        if (!error && proposalCounts) {
          const countMap = proposalCounts.reduce((acc, proposal) => {
            acc[proposal.job_id] = (acc[proposal.job_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Update jobs with proposal counts only if data changed
          setJobsWithDistance(prev => {
            const updated = prev.map(job => ({
              ...job,
              proposal_count: countMap[job.id] || 0
            }));
            return updated.length !== prev.length ? updated : prev;
          });
        }
      } catch (error) {
        console.error('[JOBS] Error fetching:', error);
      }
    };

    fetchJobsWithProposals();
  }, []); // Remove dependency to prevent loops

  // Filter jobs by completion time (completed jobs only show for 2 minutes)
  const filterJobsByTime = (jobsList: any[]) => {
    const now = new Date();
    return jobsList.filter(job => {
      // Always show open and in_progress jobs
      if (job.status === 'open' || job.status === 'in_progress') {
        return true;
      }
      
      // For completed jobs, only show if completed within last 2 minutes
      if (job.status === 'completed' && job.completed_at) {
        const completedTime = new Date(job.completed_at);
        const timeDiff = now.getTime() - completedTime.getTime();
        const twoMinutesInMs = 2 * 60 * 1000;
        return timeDiff <= twoMinutesInMs;
      }
      
      return false;
    });
  };

  // Calculate distances when position or jobs change
  useEffect(() => {
    if (!jobs.length) {
      setJobsWithDistance([]);
      return;
    }

    const filteredJobs = filterJobsByTime(jobs);
    
    if (!position) {
      setJobsWithDistance(filteredJobs as JobWithDistance[]);
      return;
    }

    const jobsWithDist = filteredJobs
      .filter(job => job.latitude && job.longitude)
      .map(job => ({
        ...job,
        distance: calculateDistance(
          position.latitude,
          position.longitude,
          job.latitude!,
          job.longitude!
        )
      } as JobWithDistance))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

    setJobsWithDistance(jobsWithDist);
  }, [position, jobs]);

  // Initialize Mapbox dynamically - versão simplificada
  useEffect(() => {
    if (!mapboxToken || viewMode !== 'map' || !mapContainer.current || mapInitialized) {
      console.log('[MAP] Skipping init:', { token: !!mapboxToken, viewMode, container: !!mapContainer.current, initialized: mapInitialized });
      return;
    }

    let isMounted = true;

    const initializeMap = async () => {
      try {
        console.log('[MAP] 🚀 Starting initialization...');
        
        // Clean up existing map first
        if (map.current) {
          console.log('[MAP] 🧹 Cleaning existing map');
          map.current.remove();
          map.current = null;
        }
        
        // Clear markers
        Object.values(markersRef.current).forEach((marker: any) => marker.remove());
        markersRef.current = {};
        
        // Import mapbox dynamically
        const mapboxgl = await import('mapbox-gl');
        await import('mapbox-gl/dist/mapbox-gl.css');
        
        if (!isMounted) return;
        
        // Store reference
        mapboxglRef.current = mapboxgl.default || mapboxgl;
        mapboxglRef.current.accessToken = mapboxToken;
        
        // Setup container with proper CSS
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
          mapContainer.current.style.cssText = `
            width: 100%;
            height: 100%;
            min-height: 500px;
            position: relative;
            background: #f0f0f0;
          `;
        }
        
        const initialCenter: [number, number] = position 
          ? [position.longitude, position.latitude]
          : [-46.6333, -23.5505];
        
        // Create map
        map.current = new mapboxglRef.current.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter,
          zoom: position ? 12 : 10,
          antialias: true
        });
        
        // Add controls
        map.current.addControl(new mapboxglRef.current.NavigationControl(), 'top-right');
        
        // Handle successful load
        map.current.on('load', () => {
          if (!isMounted) return;
          
          console.log('[MAP] ✅ Map loaded successfully!');
          setMapboxError(null);
          setMapInitialized(true);
          
          // Add user marker
          if (position && mapboxglRef.current) {
            const userEl = document.createElement('div');
            userEl.style.cssText = `
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #3b82f6;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            
            new mapboxglRef.current.Marker(userEl)
              .setLngLat([position.longitude, position.latitude])
              .addTo(map.current);
          }
          
          // Force resize after load
          setTimeout(() => {
            if (map.current && isMounted) {
              map.current.resize();
            }
          }, 100);
        });
        
        // Handle errors
        map.current.on('error', (e: any) => {
          if (!isMounted) return;
          console.error('[MAP] ❌ Error:', e);
          setMapboxError('Erro no mapa: ' + (e.error?.message || 'Desconhecido'));
        });
        
      } catch (error) {
        if (!isMounted) return;
        console.error('[MAP] ❌ Failed to initialize:', error);
        setMapboxError('Falha ao carregar mapa');
      }
    };

    initializeMap();
    
    return () => {
      isMounted = false;
      if (map.current) {
        console.log('[MAP] 🧹 Cleanup on unmount');
        map.current.remove();
        map.current = null;
        setMapInitialized(false);
      }
    };
  }, [mapboxToken, viewMode, position]);

  // Filter jobs based on search and category
  const filteredJobs = jobsWithDistance.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           job.service_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Add job markers
  useEffect(() => {
    if (!map.current || !mapInitialized || viewMode !== 'map' || !mapboxglRef.current) {
      return;
    }

    console.log('[MARKERS] Adding', filteredJobs.length, 'filtered job markers');
    
    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    // Add markers for filtered jobs only
    filteredJobs.forEach((job) => {
      if (!job.latitude || !job.longitude) return;

      const markerEl = document.createElement('div');
      const price = formatCurrency(job.budget_min, job.budget_max, job.final_price);
      const distance = job.distance ? formatDistance(job.distance) : '';
      
      // Choose color based on job status
      let borderColor = '#ef4444';
      if (job.status === 'in_progress') borderColor = '#f59e0b';
      else if (job.status === 'completed') borderColor = '#10b981';
      
      markerEl.innerHTML = `
        <div style="
          background: white;
          border-radius: 12px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 2px solid ${borderColor};
          cursor: pointer;
          min-width: 80px;
          text-align: center;
          position: relative;
        ">
          <div style="font-size: 12px; font-weight: 600; color: ${borderColor}; margin-bottom: 2px;">
            ${price}
          </div>
          <div style="font-size: 10px; color: #6b7280;">
            ${distance}
          </div>
          ${job.proposal_count && job.proposal_count > 0 ? `
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: #ef4444;
              color: white;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              font-size: 10px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
            ">${job.proposal_count}</div>
          ` : ''}
          <div style="
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid ${borderColor};
          "></div>
        </div>
      `;
      
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[MARKER] Job clicked:', job.id);
        setSelectedJob(job);
        setShowRouteDetails(true);
      });

      const marker = new mapboxglRef.current.Marker({
        element: markerEl,
        anchor: 'bottom'
      })
        .setLngLat([job.longitude, job.latitude])
        .addTo(map.current);

      markersRef.current[job.id] = marker;
    });

    // Fit map to show filtered jobs only if we have results
    if (filteredJobs.length > 0 && position && mapboxglRef.current) {
      const bounds = new mapboxglRef.current.LngLatBounds();
      bounds.extend([position.longitude, position.latitude]);
      
      filteredJobs.forEach(job => {
        if (job.longitude && job.latitude) {
          bounds.extend([job.longitude, job.latitude]);
        }
      });
      
      setTimeout(() => {
        if (map.current && !bounds.isEmpty()) {
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
      }, 500);
    }
  }, [filteredJobs, mapInitialized, position, viewMode]);

  // Auto-refresh to remove completed jobs after 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setJobsWithDistance(prev => filterJobsByTime(prev));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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

  const categories = Array.from(new Set(jobs.map(job => job.service_categories?.name).filter(Boolean)));

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
        <div className="bg-background border-b p-4 space-y-4">
          <div className="flex items-center justify-between">
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

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredJobs.length} trabalho(s) encontrado(s)
            {position && ` • ${formatDistance(0)} da sua localização`}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <>
              {mapboxError ? (
                <div className="flex items-center justify-center h-full min-h-[500px] bg-gray-100">
                  <div className="text-center p-8">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Erro no Mapa</h3>
                    <p className="text-muted-foreground">{mapboxError}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    ref={mapContainer} 
                    className="w-full h-full min-h-[500px] bg-gray-100" 
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      minHeight: '500px'
                    }}
                  />
                  
                  {!mapInitialized && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Inicializando mapa...</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Selected Job Details */}
              {selectedJob && showRouteDetails && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <Card className="bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{selectedJob.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(null);
                            setShowRouteDetails(false);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(selectedJob.status)}
                        {selectedJob.proposal_count && selectedJob.proposal_count > 0 && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {selectedJob.proposal_count} proposta(s)
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {selectedJob.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-lg text-primary">
                            {formatCurrency(selectedJob.budget_min, selectedJob.budget_max, selectedJob.final_price)}
                          </div>
                          {selectedJob.distance && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {formatDistance(selectedJob.distance)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/jobs/${selectedJob.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/jobs/${selectedJob.id}`)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Propor
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
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
                          {job.distance && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {formatDistance(job.distance)}
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
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Propor
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