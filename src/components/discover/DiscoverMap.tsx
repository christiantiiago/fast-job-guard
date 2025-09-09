import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JobMarker } from './JobMarker';
import { JobDetails } from './JobDetails';
import { Badge } from '@/components/ui/badge';
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

interface DiscoverMapProps {
  jobs: JobWithDistance[];
  position: { latitude: number; longitude: number } | null;
  formatDistance: (distance: number) => string;
  formatDuration: (duration: number) => string;
}

export function DiscoverMap({ jobs, position, formatDistance, formatDuration }: DiscoverMapProps) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithDistance | null>(null);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('[MAPBOX] Error:', error);
          setMapboxError('Erro ao carregar token do mapa');
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setMapboxError('Token não encontrado');
        }
      } catch (error) {
        console.error('[MAPBOX] Exception:', error);
        setMapboxError('Erro de rede');
      }
    };

    getMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || mapInitialized) {
      return;
    }

    let isMounted = true;

    const initializeMap = async () => {
      try {
        // Clean up existing map
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
        
        // Import mapbox dynamically
        const mapboxgl = await import('mapbox-gl');
        await import('mapbox-gl/dist/mapbox-gl.css');
        
        if (!isMounted) return;
        
        mapboxglRef.current = mapboxgl.default || mapboxgl;
        mapboxglRef.current.accessToken = mapboxToken;
        
        // Setup container
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
        
        // Handle load
        map.current.on('load', () => {
          if (!isMounted) return;
          
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
          console.error('[MAP] Error:', e);
          setMapboxError('Erro no mapa');
        });
        
      } catch (error) {
        if (!isMounted) return;
        console.error('[MAP] Failed to initialize:', error);
        setMapboxError('Falha ao carregar mapa');
      }
    };

    initializeMap();
    
    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapInitialized(false);
      }
    };
  }, [mapboxToken, position]);

  // Fit map to jobs - simplified to avoid re-renders
  useEffect(() => {
    if (!map.current || !mapInitialized || !jobs.length || !position || !mapboxglRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (!map.current) return;
      
      const bounds = new mapboxglRef.current.LngLatBounds();
      bounds.extend([position.longitude, position.latitude]);
      
      jobs.forEach(job => {
        if (job.longitude && job.latitude) {
          bounds.extend([job.longitude, job.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [jobs.length, mapInitialized, position?.latitude, position?.longitude]);

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

  if (mapboxError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px] bg-gray-100">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro no Mapa</h3>
          <p className="text-muted-foreground">{mapboxError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
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

      {/* Job Markers - Render only when map is ready */}
      {mapInitialized && mapboxglRef.current && map.current && jobs.map((job) => (
        job.latitude && job.longitude && (
          <JobMarker
            key={job.id}
            job={job}
            mapboxgl={mapboxglRef.current}
            map={map.current}
            onJobClick={(job) => setSelectedJob(job)}
            formatCurrency={formatCurrency}
            formatDistance={formatDistance}
            formatDuration={formatDuration}
          />
        )
      ))}

      {/* Selected Job Details */}
      {selectedJob && (
        <JobDetails
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          formatCurrency={formatCurrency}
          formatDistance={formatDistance}
          formatDuration={formatDuration}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );
}