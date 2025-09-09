import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, Layers, AlertTriangle, Loader2, Eye, Clock, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useJobs } from '@/hooks/useJobs';

interface JobMapData {
  id: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
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

interface JobsMapProps {
  jobs?: JobMapData[];
  className?: string;
}

const JobsMap = ({ jobs: propJobs, className = '' }: JobsMapProps) => {
  const { jobs: hookJobs, loading: jobsLoading, fetchAllPublicJobs } = useJobs();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const navigate = useNavigate();
  
  const [selectedJob, setSelectedJob] = useState<JobMapData | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11');
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [jobsWithDistance, setJobsWithDistance] = useState<JobMapData[]>([]);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const routeLayerId = 'route';
  
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  
  // Use either provided jobs or fetch all jobs
  const jobs = propJobs || hookJobs;

  // Fetch jobs if none provided
  useEffect(() => {
    if (!propJobs) {
      fetchAllPublicJobs();
    }
  }, [propJobs]);

  // Get Mapbox token from Supabase
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (err) {
        console.error('Error getting Mapbox token:', err);
      }
    };

    getMapboxToken();
  }, []);

  // Calculate distances when position or jobs change
  useEffect(() => {
    console.log('Jobs received in JobsMap:', jobs);
    console.log('Jobs with coordinates:', jobs.filter(job => job.latitude && job.longitude));
    
    if (!position || !jobs.length) {
      setJobsWithDistance(jobs.filter(job => job.status === 'open'));
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
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

    console.log('Jobs with distance calculated:', jobsWithDist);
    setJobsWithDistance(jobsWithDist);
  }, [position, jobs]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !position) return;
    
    // Prevent multiple map initialization
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [position.longitude, position.latitude],
        zoom: 12,
        pitch: 45,
        bearing: -10,
        antialias: true
      });

      // Wait for map to load before adding markers and controls
      map.current.on('load', () => {
        if (!map.current) return;

        // Add user location marker
        const userMarker = new mapboxgl.Marker({ 
          color: '#3b82f6', 
          scale: 1.2,
          draggable: false
        })
          .setLngLat([position.longitude, position.latitude])
          .setPopup(
            new mapboxgl.Popup({ closeOnClick: false })
              .setHTML('<div class="p-2 text-center"><strong>Sua localização</strong><br/><small>Localização atual</small></div>')
          )
          .addTo(map.current!);

        // Add navigation controls
        map.current!.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocate control
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        });
        map.current!.addControl(geolocate, 'top-right');

        // Add fullscreen control
        map.current!.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      });

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      // Remove map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [position, mapStyle, mapboxToken]);

  // Add job markers
  useEffect(() => {
    if (!map.current || !position || !jobsWithDistance.length) return;

    // Wait for map to be loaded
    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        marker.remove();
      });
      markersRef.current = [];

      // Add markers for jobs with location and distance
      jobsWithDistance.forEach((job, index) => {
        if (!job.longitude || !job.latitude) return;

        const statusColors = {
          open: '#3b82f6',
          in_progress: '#eab308',
          completed: '#22c55e',
          cancelled: '#ef4444'
        };

        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'job-marker';
        
        const price = formatCurrency(job.budget_min, job.budget_max, job.final_price);
        const distance = job.distance ? formatDistance(job.distance) : '';
        
        markerEl.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            padding: 8px 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 2px solid ${statusColors[job.status as keyof typeof statusColors] || '#6b7280'};
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            min-width: 80px;
            text-align: center;
            z-index: ${1000 - index};
          ">
            <div style="
              font-size: 12px;
              font-weight: 600;
              color: ${statusColors[job.status as keyof typeof statusColors] || '#6b7280'};
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
              border-top: 6px solid ${statusColors[job.status as keyof typeof statusColors] || '#6b7280'};
            "></div>
          </div>
        `;

        // Enhanced hover effects
        const handleMouseEnter = () => {
          markerEl.style.transform = 'scale(1.1)';
          markerEl.style.zIndex = '10000';
          markerEl.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        };

        const handleMouseLeave = () => {
          markerEl.style.transform = 'scale(1)';
          markerEl.style.zIndex = `${1000 - index}`;
          markerEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        };

        const handleClick = (e: Event) => {
          e.stopPropagation();
          setSelectedJob(job);
          calculateRoute(job);
          
          // Smooth fly to job location
          map.current?.flyTo({
            center: [job.longitude!, job.latitude!],
            zoom: 16,
            duration: 1000,
            essential: true
          });
        };

        markerEl.addEventListener('mouseenter', handleMouseEnter);
        markerEl.addEventListener('mouseleave', handleMouseLeave);
        markerEl.addEventListener('click', handleClick);

        // Create marker
        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([job.longitude, job.latitude])
          .addTo(map.current!);

        // Store cleanup functions
        (marker as any).cleanup = () => {
          markerEl.removeEventListener('mouseenter', handleMouseEnter);
          markerEl.removeEventListener('mouseleave', handleMouseLeave);
          markerEl.removeEventListener('click', handleClick);
        };

        markersRef.current.push(marker);
      });

      // Fit map bounds with better logic
      if (jobsWithDistance.length > 0 && position && map.current?.isStyleLoaded()) {
        const bounds = new mapboxgl.LngLatBounds();
        
        // Include user position
        bounds.extend([position.longitude, position.latitude]);
        
        // Include job positions
        jobsWithDistance.forEach(job => {
          if (job.longitude && job.latitude) {
            bounds.extend([job.longitude, job.latitude]);
          }
        });
        
        // Better bounds fitting
        const boundsPadding = {
          top: 100,
          bottom: selectedJob ? 200 : 100,
          left: 100,
          right: 100
        };

        try {
          map.current.fitBounds(bounds, {
            padding: boundsPadding,
            maxZoom: 14,
            duration: 1000
          });
        } catch (error) {
          console.warn('Error fitting bounds:', error);
        }
      }
    };

    if (map.current.isStyleLoaded()) {
      addMarkers();
    } else {
      map.current.on('styledata', addMarkers);
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        if ((marker as any).cleanup) {
          (marker as any).cleanup();
        }
        marker.remove();
      });
      markersRef.current = [];
    };
  }, [jobsWithDistance, position, selectedJob]);

  const calculateRoute = async (job: JobMapData) => {
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

  const formatCurrency = (min?: number, max?: number, final?: number) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });

    if (final) {
      return formatter.format(final);
    } else if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `A partir de ${formatter.format(min)}`;
    }
    return 'A combinar';
  };

  const formatAddress = (addresses?: JobMapData['addresses']) => {
    if (!addresses) return 'Localização não informada';
    
    return [addresses.neighborhood, addresses.city, addresses.state]
      .filter(Boolean)
      .join(', ');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Aberto' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Em andamento' },
      completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Concluído' },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelado' }
    };

    const config = variants[status as keyof typeof variants] || variants.open;
    return (
      <Badge className={`${config.color} border`}>
        {config.label}
      </Badge>
    );
  };

  const mapStyles = [
    { id: 'light', name: 'Claro', style: 'mapbox://styles/mapbox/light-v11' },
    { id: 'dark', name: 'Escuro', style: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'satellite', name: 'Satélite', style: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'streets', name: 'Ruas', style: 'mapbox://styles/mapbox/streets-v12' }
  ];

  // Show loading or error states
  if (geoLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            Obtendo sua localização...
          </p>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className={`${className}`}>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Localização necessária:</strong> {geoError}
            <br />
            Por favor, permita o acesso à sua localização para ver os trabalhos próximos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!position) {
    return (
      <div className={`${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível obter sua localização. Verifique se o GPS está ativado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            Carregando mapa...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Location Info */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="font-medium text-green-600">GPS Ativo</span>
          </div>
        </Card>
      </div>

      {/* Map Controls */}
      <div className="absolute top-16 left-4 z-10 space-y-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <select
              value={mapStyle}
              onChange={(e) => {
                setMapStyle(e.target.value);
                map.current?.setStyle(e.target.value);
              }}
              className="text-sm border-0 bg-transparent focus:outline-none"
            >
              {mapStyles.map(style => (
                <option key={style.id} value={style.style}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="p-2">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Aberto</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Em andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Concluído</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Job Details Card */}
      {selectedJob && (
        <div className="absolute bottom-4 left-4 right-4 z-10 md:right-auto md:w-96">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg line-clamp-2">{selectedJob.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedJob.service_categories?.name || 'Serviço'}
                    </Badge>
                    {getStatusBadge(selectedJob.status)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {selectedJob.description}
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {formatAddress(selectedJob.addresses)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-primary">
                    {formatCurrency(selectedJob.budget_min, selectedJob.budget_max, selectedJob.final_price)}
                  </span>
                </div>
                
                {selectedJob.distance && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatDistance(selectedJob.distance)} de distância
                    </span>
                  </div>
                )}
                
                {showRouteDetails && selectedJob.routeDistance && selectedJob.routeDuration && (
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">
                        {formatDuration(selectedJob.routeDuration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">
                        {formatRouteDistance(selectedJob.routeDistance)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/jobs/${selectedJob.id}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Loading/Error States */}
      {(jobsLoading) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              Carregando trabalhos...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsMap;