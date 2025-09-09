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
          
          // Add user marker (bonequinho estilo Waze)
          if (position && mapboxglRef.current) {
            const userEl = document.createElement('div');
            userEl.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
              ">
                <!-- Bonequinho Avatar -->
                <div style="
                  width: 50px;
                  height: 50px;
                  background: linear-gradient(135deg, #00d4aa, #00b894);
                  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 8px 25px rgba(0, 212, 170, 0.4), 0 3px 10px rgba(0,0,0,0.15);
                  border: 4px solid white;
                  position: relative;
                  z-index: 2;
                  transform: rotate(-5deg);
                ">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="transform: rotate(5deg);">
                    <!-- Rosto -->
                    <circle cx="12" cy="10" r="3" fill="white" opacity="0.9"/>
                    <!-- Olhos -->
                    <circle cx="10.5" cy="9" r="0.8" fill="#2d3748"/>
                    <circle cx="13.5" cy="9" r="0.8" fill="#2d3748"/>
                    <!-- Boca sorrindo -->
                    <path d="M10 11.5 Q12 13 14 11.5" stroke="#2d3748" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                    <!-- Corpo -->
                    <rect x="10" y="13" width="4" height="5" rx="2" fill="white" opacity="0.8"/>
                    <!-- Braços -->
                    <circle cx="8.5" cy="15" r="1" fill="white" opacity="0.7"/>
                    <circle cx="15.5" cy="15" r="1" fill="white" opacity="0.7"/>
                  </svg>
                </div>
                
                <!-- Pulse effect -->
                <div style="
                  position: absolute;
                  top: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 50px;
                  height: 50px;
                  border-radius: 50%;
                  background: rgba(0, 212, 170, 0.3);
                  animation: wazePulse 2.5s infinite;
                  z-index: 1;
                "></div>
                
                <!-- Shadow -->
                <div style="
                  position: absolute;
                  bottom: -5px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 30px;
                  height: 8px;
                  background: rgba(0,0,0,0.2);
                  border-radius: 50%;
                  filter: blur(3px);
                  z-index: 0;
                "></div>
                
                <!-- Label -->
                <div style="
                  background: linear-gradient(135deg, #00d4aa, #00b894);
                  color: white;
                  padding: 4px 10px;
                  border-radius: 15px;
                  font-size: 10px;
                  font-weight: 700;
                  margin-top: 12px;
                  box-shadow: 0 3px 12px rgba(0, 212, 170, 0.3);
                  border: 2px solid white;
                  white-space: nowrap;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                ">
                  👋 Você
                </div>
              </div>
            `;
            
            // Add CSS animation for Waze-style pulse effect
            const style = document.createElement('style');
            style.textContent = `
              @keyframes wazePulse {
                0% {
                  transform: translateX(-50%) scale(1);
                  opacity: 0.7;
                }
                50% {
                  transform: translateX(-50%) scale(1.3);
                  opacity: 0.3;
                }
                100% {
                  transform: translateX(-50%) scale(1.6);
                  opacity: 0;
                }
              }
            `;
            document.head.appendChild(style);
            
            new mapboxglRef.current.Marker(userEl, { 
              anchor: 'bottom',
              offset: [0, 5]
            })
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