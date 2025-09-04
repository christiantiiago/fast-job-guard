import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Layers, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to São Paulo if location is denied
          setUserLocation([-46.6333, -23.5505]);
        }
      );
    } else {
      // Default to São Paulo
      setUserLocation([-46.6333, -23.5505]);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !userLocation) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZS1tYXAiLCJhIjoiY2x3aDV5YzF4MGV6cTJqcGd6Mm9sdnppbyJ9.4-QACX8mPQeRQN6KMTjPfA';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: userLocation,
      zoom: 11,
      pitch: 45,
      bearing: -10
    });

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
  }, [userLocation, mapStyle]);

  // Add job markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for jobs with location
    const jobsWithLocation = jobs.filter(job => job.latitude && job.longitude);

    jobsWithLocation.forEach((job) => {
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
      
      // Add price or status indicator
      const price = job.final_price || job.budget_max || job.budget_min;
      if (price) {
        markerEl.textContent = `R$${(price / 1000).toFixed(0)}k`;
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
    if (jobsWithLocation.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      jobsWithLocation.forEach(job => {
        bounds.extend([job.longitude!, job.latitude!]);
      });
      
      // Add padding and delay to ensure map is ready
      setTimeout(() => {
        map.current?.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
      }, 100);
    }
  }, [jobs]);

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

  return (
    <div className={`relative ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
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
              {jobs.filter(j => j.latitude && j.longitude).length} trabalhos no mapa
            </span>
          </div>
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