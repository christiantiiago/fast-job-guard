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
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

export default function EnhancedDiscoverPage() {
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
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const routeLayerId = 'route';

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        console.log('Fetching Mapbox token...');
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setMapboxError('Erro ao carregar token do mapa');
          return;
        }
        
        if (data?.token) {
          console.log('Mapbox token retrieved successfully');
          setMapboxToken(data.token);
        } else {
          console.error('No token in response');
          setMapboxError('Token do mapa não disponível');
        }
      } catch (error) {
        console.error('Exception fetching Mapbox token:', error);
        setMapboxError('Erro de conexão ao carregar mapa');
      }
    };

    getMapboxToken();
  }, []);

  // Fetch jobs and calculate proposal counts
  useEffect(() => {
    const fetchJobsWithProposals = async () => {
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
        
        // Update jobs with proposal counts
        setJobsWithDistance(prev => prev.map(job => ({
          ...job,
          proposal_count: countMap[job.id] || 0
        })));
      }
    };

    fetchJobsWithProposals();
    
    // Real-time subscription
    const channel = supabase
      .channel('jobs-discover')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchJobsWithProposals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchJobsWithProposals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || viewMode !== 'map') {
      return;
    }

    if (map.current) {
      return; // Map already initialized
    }

    try {
      console.log('Initializing Mapbox map...');
      
      mapboxgl.accessToken = mapboxToken;
      
      const initialCenter: [number, number] = position 
        ? [position.longitude, position.latitude]
        : [-46.6333, -23.5505]; // São Paulo default
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: position ? 13 : 10,
        pitch: 0,
        bearing: 0
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapboxError(null);
        
        // Add user location marker if available
        if (position) {
          const userEl = createUserMarker();
          new mapboxgl.Marker(userEl)
            .setLngLat([position.longitude, position.latitude])
            .addTo(map.current!);
        }
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapboxError('Erro ao carregar o mapa');
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapboxError('Erro ao inicializar o mapa');
    }
  }, [mapboxToken, position, viewMode]);

  // Update map markers when jobs change
  useEffect(() => {
    if (!map.current || viewMode !== 'map') return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add markers for jobs
    jobsWithDistance.forEach((job) => {
      if (!job.latitude || !job.longitude) return;

      const markerEl = createJobMarker(job);
      
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([job.longitude, job.latitude])
        .addTo(map.current!);

      // Add click handler
      markerEl.addEventListener('click', () => {
        setSelectedJob(job);
        calculateRoute(job);
        
        // Center map on job
        map.current?.flyTo({
          center: [job.longitude!, job.latitude!],
          zoom: 15,
          duration: 1000
        });
      });

      markersRef.current[job.id] = marker;
    });

    // Fit map to show all jobs
    if (jobsWithDistance.length > 0 && position) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([position.longitude, position.latitude]);
      
      jobsWithDistance.forEach(job => {
        if (job.longitude && job.latitude) {
          bounds.extend([job.longitude, job.latitude]);
        }
      });
      
      setTimeout(() => {
        if (map.current && !bounds.isEmpty()) {
          map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
          });
        }
      }, 500);
    }
  }, [jobsWithDistance, position, viewMode]);

  // Auto-refresh to remove completed jobs after 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setJobsWithDistance(prev => {
        const filtered = filterJobsByTime(prev);
        return filtered;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const createUserMarker = () => {
    const el = document.createElement('div');
    el.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    `;
    
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: absolute;
      top: -10px;
      left: -10px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.3);
      animation: pulse 2s infinite;
    `;
    el.appendChild(pulse);
    
    return el;
  };

  const createJobMarker = (job: JobWithDistance) => {
    const el = document.createElement('div');
    el.className = 'job-marker';
    
    const price = formatCurrency(job.budget_min, job.budget_max, job.final_price);
    const distance = job.distance ? formatDistance(job.distance) : '';
    
    // Choose color based on job status
    let borderColor = '#ef4444'; // red for open
    let bgColor = '#fee2e2';
    
    if (job.status === 'in_progress') {
      borderColor = '#f59e0b'; // orange for in progress
      bgColor = '#fef3c7';
    } else if (job.status === 'completed') {
      borderColor = '#10b981'; // green for completed
      bgColor = '#d1fae5';
    }
    
    el.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 8px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid ${borderColor};
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        min-width: 80px;
        text-align: center;
      ">
        <div style="
          font-size: 12px;
          font-weight: 600;
          color: ${borderColor};
          margin-bottom: 2px;
        ">${price}</div>
        <div style="
          font-size: 10px;
          color: #6b7280;
        ">${distance}</div>
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
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${job.proposal_count}</div>
        ` : ''}
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid ${borderColor};
        "></div>
      </div>
    `;
    
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.1)';
      el.style.zIndex = '1000';
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';
    });
    
    return el;
  };

  const calculateRoute = async (job: JobWithDistance) => {
    if (!position || !job.latitude || !job.longitude || !mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${position.longitude},${position.latitude};${job.longitude},${job.latitude}?geometries=geojson&access_token=${mapboxToken}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        
        setSelectedJob(prev => prev ? {
          ...prev,
          routeDistance: route.distance,
          routeDuration: route.duration
        } : null);
        
        // Add route to map
        if (map.current) {
          if (map.current.getLayer(routeLayerId)) {
            map.current.removeLayer(routeLayerId);
            map.current.removeSource(routeLayerId);
          }
          
          map.current.addSource(routeLayerId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });
          
          map.current.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeLayerId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });
        }
        
        setShowRouteDetails(true);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const formatRouteDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
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

  const filteredJobs = jobsWithDistance.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           job.service_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

          {/* Search and filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar trabalhos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category!}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredJobs.length} trabalhos encontrados
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <div className="h-full relative">
              {mapboxError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-4 p-6">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Erro ao carregar o mapa
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {mapboxError}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        Ver em Lista
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !mapboxToken ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    <p className="text-sm font-medium">
                      Carregando mapa...
                    </p>
                  </div>
                </div>
              ) : (
                <div ref={mapContainer} className="absolute inset-0" />
              )}
              
              {/* Route details overlay */}
              {selectedJob && showRouteDetails && (
                <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm">
                  <Card className="shadow-lg">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-1">{selectedJob.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(selectedJob.status)}
                            {selectedJob.proposal_count && selectedJob.proposal_count > 0 && (
                              <Badge className="bg-red-100 text-red-800">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {selectedJob.proposal_count} proposta{selectedJob.proposal_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedJob(null);
                            setShowRouteDetails(false);
                            if (map.current && map.current.getLayer(routeLayerId)) {
                              map.current.removeLayer(routeLayerId);
                              map.current.removeSource(routeLayerId);
                            }
                          }}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium">
                              {selectedJob.routeDistance ? 
                                formatRouteDistance(selectedJob.routeDistance) : 
                                formatDistance(selectedJob.distance || 0)
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">Distância</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          <div>
                            <div className="font-medium">
                              {selectedJob.routeDuration ? 
                                formatDuration(selectedJob.routeDuration) : 
                                'Calculando...'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">Tempo</div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="text-lg font-bold text-primary mb-2">
                          {formatCurrency(
                            selectedJob.budget_min,
                            selectedJob.budget_max,
                            selectedJob.final_price
                          )}
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => navigate(`/jobs/${selectedJob.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Stats overlay */}
              <div className="absolute top-4 right-4 z-10">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">
                      {jobsWithDistance.length} trabalhos
                    </span>
                  </div>
                  {position && (
                    <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      GPS Ativo
                    </div>
                  )}
                </Card>
              </div>

              {/* Status legend */}
              <div className="absolute top-4 left-4 z-10">
                <Card className="p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Legenda</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div>
                      <span>Aberto</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></div>
                      <span>Em andamento</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
                      <span>Concluído</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="font-semibold text-lg flex-1">{job.title}</h3>
                          {job.proposal_count && job.proposal_count > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {job.proposal_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {job.description}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(job.status)}
                          <Badge variant="outline" className="text-xs">
                            {job.service_categories?.name}
                          </Badge>
                          {job.distance && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {formatDistance(job.distance)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.addresses ? 
                            `${job.addresses.neighborhood}, ${job.addresses.city}` : 
                            'Localização não informada'
                          }
                        </div>
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.5;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </AppLayout>
  );
}