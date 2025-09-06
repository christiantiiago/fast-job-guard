import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, Layers, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

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
}

interface JobsMapProps {
  jobs: JobMapData[];
  className?: string;
}

const JobsMap = ({ jobs, className = '' }: JobsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const navigate = useNavigate();
  
  const [selectedJob, setSelectedJob] = useState<JobMapData | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11');
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [jobsWithDistance, setJobsWithDistance] = useState<JobMapData[]>([]);
  
  const { position, error: geoError, loading: geoLoading } = useGeolocation();

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
      setJobsWithDistance(jobs);
      return;
    }

    const jobsWithDist = jobs
      .filter(job => job.latitude && job.longitude)
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

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [position.longitude, position.latitude],
      zoom: 12,
      pitch: 45,
      bearing: -10
    });

    // Add user location marker
    new mapboxgl.Marker({ color: '#3b82f6', scale: 1.2 })
      .setLngLat([position.longitude, position.latitude])
      .setPopup(new mapboxgl.Popup().setHTML('<div class="p-2"><strong>Sua localização</strong></div>'))
      .addTo(map.current);

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocate, 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [position, mapStyle, mapboxToken]);

  // Add job markers
  useEffect(() => {
    if (!map.current || !position) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for jobs with location and distance
    jobsWithDistance.forEach((job) => {
      const statusColors = {
        open: '#3b82f6',
        in_progress: '#eab308',
        completed: '#22c55e',
        cancelled: '#ef4444'
      };

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'job-marker';
      markerEl.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${statusColors[job.status as keyof typeof statusColors] || '#6b7280'};
        border: 3px solid white;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        transition: all 0.3s ease;
      `;
      
      // Add distance indicator
      if (job.distance !== undefined) {
        markerEl.textContent = formatDistance(job.distance);
        markerEl.style.fontSize = '10px';
      } else {
        markerEl.innerHTML = '<div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>';
      }

      // Add hover effect
      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.2)';
        markerEl.style.zIndex = '1000';
      });

      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
        markerEl.style.zIndex = '1';
      });

      // Create marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([job.longitude!, job.latitude!])
        .addTo(map.current!);

      // Add click handler
      markerEl.addEventListener('click', () => {
        setSelectedJob(job);
        
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
    if (jobsWithDistance.length > 0 && position) {
      const bounds = new mapboxgl.LngLatBounds();
      
      // Include user position
      bounds.extend([position.longitude, position.latitude]);
      
      // Include job positions
      jobsWithDistance.forEach(job => {
        if (job.longitude && job.latitude) {
          bounds.extend([job.longitude, job.latitude]);
        }
      });
      
      // Add padding and delay to ensure map is ready
      setTimeout(() => {
        map.current?.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 15
        });
      }, 500);
    }
  }, [jobsWithDistance, position]);

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
                {selectedJob.distance !== undefined && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-600 font-medium">
                      {formatDistance(selectedJob.distance)} de distância
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">
                    {formatCurrency(
                      selectedJob.budget_min, 
                      selectedJob.budget_max, 
                      selectedJob.final_price
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
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
                  onClick={() => {
                    map.current?.flyTo({
                      center: [selectedJob.longitude!, selectedJob.latitude!],
                      zoom: 17,
                      duration: 1000
                    });
                  }}
                >
                  <Navigation className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />

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

      <style>{`
        .job-marker:hover {
          transform: scale(1.2) !important;
        }
      `}</style>
    </div>
  );
};

export default JobsMap;