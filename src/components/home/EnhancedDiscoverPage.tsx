import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Navigation, 
  Clock,
  DollarSign,
  User,
  Star,
  Route,
  Loader2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
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
  const [mapRetryCount, setMapRetryCount] = useState(0);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayerId = 'route';

  // Get Mapbox token with retry logic
  useEffect(() => {
    const getMapboxToken = async (attempt = 1) => {
      try {
        console.log(`[Map] Fetching Mapbox token (attempt ${attempt})...`);
        setMapboxError(null);
        
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        console.log('[Map] Mapbox token response:', { data, error });
        
        if (error) {
          console.error('[Map] Error from Mapbox function:', error);
          throw new Error(error.message || 'Failed to fetch token');
        }
        
        if (data?.token) {
          console.log('[Map] Mapbox token retrieved successfully');
          setMapboxToken(data.token);
          setMapRetryCount(0);
        } else {
          console.error('[Map] No token in response:', data);
          throw new Error(data?.message || 'Token not found in response');
        }
      } catch (err) {
        console.error(`[Map] Error getting Mapbox token (attempt ${attempt}):`, err);
        setMapboxError(err.message || 'Failed to load map');
        
        // Retry up to 3 times with exponential backoff
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[Map] Retrying in ${delay}ms...`);
          setTimeout(() => {
            setMapRetryCount(attempt);
            getMapboxToken(attempt + 1);
          }, delay);
        } else {
          console.error('[Map] Max retries exceeded, giving up');
          setMapboxToken('error');
        }
      }
    };
    
    getMapboxToken();
  }, []);

  // Fetch jobs on mount and subscribe to real-time updates
  useEffect(() => {
    fetchAllPublicJobs();
    
    // Subscribe to real-time job updates
    const channel = supabase
      .channel('public:jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Job update received:', payload);
          // Refetch jobs when there's any change
          fetchAllPublicJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate distances when position or jobs change
  useEffect(() => {
    if (!position || !jobs.length) {
      setJobsWithDistance(jobs.filter(job => job.status === 'open') as JobWithDistance[]);
      return;
    }

    const jobsWithDist = jobs
      .filter(job => job.status === 'open' && job.latitude && job.longitude)
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

  // Initialize map with better error handling
  useEffect(() => {
    if (!mapContainer.current || !position || viewMode !== 'map') {
      console.log('[Map] Skipping map initialization:', { 
        hasContainer: !!mapContainer.current, 
        hasPosition: !!position, 
        viewMode 
      });
      return;
    }

    if (mapboxToken === 'error') {
      console.error('[Map] Cannot initialize map: Mapbox token error');
      return;
    }

    if (!mapboxToken) {
      console.log('[Map] Waiting for Mapbox token...');
      return;
    }

    if (map.current) {
      console.log('[Map] Map already initialized');
      return;
    }

    try {
      console.log('[Map] Initializing map with token:', mapboxToken.substring(0, 20) + '...');
      console.log('[Map] User position:', position);
      
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [position.longitude, position.latitude],
        zoom: 12,
        pitch: 0,
        bearing: 0
      });

      map.current.on('load', () => {
        console.log('[Map] Map loaded successfully');
      });

      map.current.on('error', (e) => {
        console.error('[Map] Map error:', e);
        setMapboxError('Erro ao carregar o mapa');
      });

      // Add user location marker
      const userMarker = new mapboxgl.Marker({ 
        color: '#3b82f6', 
        scale: 1.2,
        element: createUserMarker()
      })
        .setLngLat([position.longitude, position.latitude])
        .setPopup(new mapboxgl.Popup().setHTML('<div class="p-2 font-medium">Sua localização</div>'))
        .addTo(map.current);

      // Add controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      console.log('[Map] Map initialization complete');
      
    } catch (error) {
      console.error('[Map] Error initializing map:', error);
      setMapboxError('Erro ao inicializar o mapa');
      setMapboxToken('error');
    }
    
    return () => {
      if (map.current) {
        console.log('[Map] Cleaning up map');
        map.current.remove();
        map.current = null;
      }
    };
  }, [position, mapboxToken, viewMode]);

  // Add job markers to map
  useEffect(() => {
    if (!map.current || !position || viewMode !== 'map') return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

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
        
        // Fly to job location
        map.current?.flyTo({
          center: [job.longitude!, job.latitude!],
          zoom: 15,
          duration: 1500
        });
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all jobs
    if (jobsWithDistance.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([position.longitude, position.latitude]);
      
      jobsWithDistance.forEach(job => {
        if (job.longitude && job.latitude) {
          bounds.extend([job.longitude, job.latitude]);
        }
      });
      
      setTimeout(() => {
        map.current?.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 15
        });
      }, 500);
    }
  }, [jobsWithDistance, position, viewMode]);

  const createUserMarker = () => {
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    `;
    
    // Add pulsing animation
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
    
    el.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 8px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid #ef4444;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        min-width: 80px;
        text-align: center;
      ">
        <div style="
          font-size: 12px;
          font-weight: 600;
          color: #ef4444;
          margin-bottom: 2px;
        ">${price}</div>
        <div style="
          font-size: 10px;
          color: #6b7280;
        ">${distance}</div>
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #ef4444;
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
        const distance = route.distance;
        const duration = route.duration;
        
        setSelectedJob(prev => prev ? {
          ...prev,
          routeDistance: distance,
          routeDuration: duration
        } : null);
        
        // Add route to map
        if (map.current) {
          // Remove existing route
          if (map.current.getLayer(routeLayerId)) {
            map.current.removeLayer(routeLayerId);
            map.current.removeSource(routeLayerId);
          }
          
          // Add new route
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
              'line-color': '#ef4444',
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
              {mapboxToken === 'error' || mapboxError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-4 p-6">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Erro ao carregar o mapa
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {mapboxError || 'Configure a chave da API do Mapbox no Supabase'}
                      </p>
                      {mapRetryCount > 0 && (
                        <p className="text-xs text-muted-foreground mb-4">
                          Tentativa {mapRetryCount} de 3...
                        </p>
                      )}
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
                    <div>
                      <p className="text-sm font-medium">
                        Carregando mapa...
                      </p>
                      {mapRetryCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Reconectando... (tentativa {mapRetryCount})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={mapContainer} className="absolute inset-0" />
              )}
              
              {/* Route details overlay */}
              {selectedJob && showRouteDetails && (
                <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm">
                  <Card className="shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg line-clamp-1">{selectedJob.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {selectedJob.service_categories?.name}
                            </Badge>
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
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Route className="w-4 h-4 text-red-500" />
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
                          <Clock className="w-4 h-4 text-blue-500" />
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
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/jobs/${selectedJob.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                          >
                            Aceitar Rota
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Jobs Counter */}
              <div className="absolute top-4 right-4 z-10">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">
                      {jobsWithDistance.length} trabalhos próximos
                    </span>
                  </div>
                  {jobsWithDistance.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Mais próximo: {formatDistance(jobsWithDistance[0]?.distance || 0)}
                    </div>
                  )}
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
                        <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {job.description}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
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