import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Star, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Provider {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  rating_avg: number;
  rating_count: number;
  is_premium: boolean;
  is_online?: boolean;
  last_activity_minutes?: number;
  distance_km: number;
  services: any[];
  priority_score: number;
  latitude?: number;
  longitude?: number;
  address?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

interface ProviderMapProps {
  providers: Provider[];
  position: { latitude: number; longitude: number } | null;
  onProviderSelect?: (provider: Provider) => void;
}

export function ProviderMap({ providers, position, onProviderSelect }: ProviderMapProps) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const navigate = useNavigate();

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
            userEl.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
              ">
                <div style="
                  width: 44px;
                  height: 44px;
                  background: linear-gradient(135deg, #1e40af, #3b82f6);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0,0,0,0.1);
                  border: 4px solid white;
                  position: relative;
                  z-index: 2;
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                
                <div style="
                  position: absolute;
                  top: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 44px;
                  height: 44px;
                  border-radius: 50%;
                  background: rgba(59, 130, 246, 0.3);
                  animation: pulse 2s infinite;
                  z-index: 1;
                "></div>
                
                <div style="
                  background: white;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-size: 10px;
                  font-weight: 600;
                  color: #1e40af;
                  margin-top: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  border: 1px solid rgba(59, 130, 246, 0.2);
                  white-space: nowrap;
                ">
                  Você
                </div>
              </div>
            `;
            
            // Add CSS animation for pulse effect
            const style = document.createElement('style');
            style.textContent = `
              @keyframes pulse {
                0% {
                  transform: translateX(-50%) scale(1);
                  opacity: 1;
                }
                70% {
                  transform: translateX(-50%) scale(1.4);
                  opacity: 0;
                }
                100% {
                  transform: translateX(-50%) scale(1.4);
                  opacity: 0;
                }
              }
            `;
            document.head.appendChild(style);
            
            new mapboxglRef.current.Marker(userEl, { 
              anchor: 'bottom',
              offset: [0, 0]
            })
              .setLngLat([position.longitude, position.latitude])
              .addTo(map.current);
          }
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
      // Clean up markers
      markersRef.current.forEach(marker => {
        if (marker.remove) marker.remove();
      });
      markersRef.current = [];
      
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapInitialized(false);
      }
    };
  }, [mapboxToken, position]);

  // Add provider markers
  useEffect(() => {
    if (!map.current || !mapInitialized || !mapboxglRef.current) return;

    // Clean up existing markers
    markersRef.current.forEach(marker => {
      if (marker.remove) marker.remove();
    });
    markersRef.current = [];

    // Add provider markers
    providers.forEach((provider, index) => {
      if (!provider.latitude || !provider.longitude) return;

      // Create provider marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'provider-marker';
      
      const statusColor = provider.is_online ? '#22c55e' : '#6b7280';
      const premiumBorder = provider.is_premium ? '3px solid #f59e0b' : '2px solid white';
      
      markerEl.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          cursor: pointer;
        ">
          <div style="
            position: relative;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: ${premiumBorder};
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: ${1000 - index};
          ">
            ${provider.avatar_url ? `
              <img src="${provider.avatar_url}" 
                   style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" 
                   alt="${provider.full_name}" />
            ` : `
              <div style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 16px;
              ">
                ${provider.full_name.charAt(0).toUpperCase()}
              </div>
            `}
            
            <!-- Online status indicator -->
            <div style="
              position: absolute;
              bottom: 2px;
              right: 2px;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: ${statusColor};
              border: 2px solid white;
            "></div>
            
            ${provider.is_premium ? `
              <!-- Premium crown -->
              <div style="
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                background: #f59e0b;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              ">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M5 16L3 5l4 3 5-4 5 4 4-3-2 11H5z"/>
                </svg>
              </div>
            ` : ''}
          </div>
          
          <!-- Rating badge -->
          <div style="
            background: white;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 600;
            color: #374151;
            margin-top: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            border: 1px solid rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 2px;
          ">
            <span style="color: #f59e0b;">★</span>
            ${provider.rating_avg.toFixed(1)}
            ${provider.distance_km < 999999 ? `<span style="margin-left: 4px; color: #6b7280;">• ${provider.distance_km.toFixed(1)}km</span>` : ''}
          </div>
        </div>
      `;

      // Add hover effects
      const handleMouseEnter = () => {
        markerEl.style.transform = 'scale(1.1)';
        markerEl.style.zIndex = '10000';
      };

      const handleMouseLeave = () => {
        markerEl.style.transform = 'scale(1)';
        markerEl.style.zIndex = `${1000 - index}`;
      };

      const handleClick = (e: Event) => {
        e.stopPropagation();
        setSelectedProvider(provider);
        onProviderSelect?.(provider);
        
        // Fly to provider location
        map.current?.flyTo({
          center: [provider.longitude!, provider.latitude!],
          zoom: 16,
          duration: 1000,
          essential: true
        });
      };

      markerEl.addEventListener('mouseenter', handleMouseEnter);
      markerEl.addEventListener('mouseleave', handleMouseLeave);
      markerEl.addEventListener('click', handleClick);

      // Create marker
      const marker = new mapboxglRef.current.Marker(markerEl, { 
        anchor: 'bottom',
        offset: [0, 0] 
      })
        .setLngLat([provider.longitude, provider.latitude])
        .addTo(map.current);

      // Store cleanup function
      (marker as any).cleanup = () => {
        markerEl.removeEventListener('mouseenter', handleMouseEnter);
        markerEl.removeEventListener('mouseleave', handleMouseLeave);
        markerEl.removeEventListener('click', handleClick);
      };

      markersRef.current.push(marker);
    });

    // Fit bounds to include all providers and user
    if (providers.length > 0 && position && map.current?.isStyleLoaded()) {
      const bounds = new mapboxglRef.current.LngLatBounds();
      
      bounds.extend([position.longitude, position.latitude]);
      
      providers.forEach(provider => {
        if (provider.longitude && provider.latitude) {
          bounds.extend([provider.longitude, provider.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { 
          padding: { top: 80, bottom: selectedProvider ? 220 : 80, left: 80, right: 80 },
          maxZoom: 14,
          duration: 1000
        });
      }
    }

    return () => {
      markersRef.current.forEach(marker => {
        if ((marker as any).cleanup) {
          (marker as any).cleanup();
        }
        if (marker.remove) marker.remove();
      });
      markersRef.current = [];
    };
  }, [providers, mapInitialized, position, selectedProvider]);

  const formatLastActivity = (minutes: number | null) => {
    if (!minutes) return 'Nunca ativo';
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
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

      {/* Selected Provider Details */}
      {selectedProvider && (
        <Card className="absolute bottom-4 left-4 right-4 max-w-md mx-auto shadow-lg border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  {selectedProvider.avatar_url ? (
                    <AvatarImage 
                      src={selectedProvider.avatar_url} 
                      alt={selectedProvider.full_name}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-semibold text-lg">
                      {selectedProvider.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div 
                  className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${
                    selectedProvider.is_online ? 'bg-green-500' : 'bg-gray-400'
                  }`} 
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg truncate">{selectedProvider.full_name}</h4>
                      {selectedProvider.is_premium && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                        <span className="font-medium">{selectedProvider.rating_avg.toFixed(1)}</span>
                        <span className="text-muted-foreground">({selectedProvider.rating_count})</span>
                      </div>
                      
                      {selectedProvider.distance_km < 999999 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm font-medium text-primary">
                            {selectedProvider.distance_km.toFixed(1)}km
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {selectedProvider.is_online 
                          ? 'Online agora' 
                          : formatLastActivity(selectedProvider.last_activity_minutes)
                        }
                      </span>
                    </div>

                    {selectedProvider.address && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {[selectedProvider.address.neighborhood, selectedProvider.address.city]
                            .filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedProvider.services.slice(0, 2).map(service => (
                    <Badge key={service.id} variant="outline" className="text-xs">
                      {service.title}
                    </Badge>
                  ))}
                  {selectedProvider.services.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedProvider.services.length - 2}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/user-profile/${selectedProvider.user_id}`)}
                    className="text-xs flex-1"
                  >
                    Ver Perfil
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onProviderSelect?.(selectedProvider)}
                    className="text-xs flex-1"
                  >
                    Contratar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}