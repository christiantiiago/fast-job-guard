import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';

interface MapMarker {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

interface MapProps {
  latitude?: number;
  longitude?: number;
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  className?: string;
  height?: string;
  markers?: MapMarker[];
  onLocationSelect?: (coordinates: [number, number], address?: string) => void;
  showMarker?: boolean;
  interactive?: boolean;
}

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTQwcmdlaGUwN3E0Mmxxb2FuY29jdG16In0.FKBfqIhY5AdAvHEHj5Iffw';

const Map: React.FC<MapProps> = ({ 
  latitude,
  longitude,
  center,
  zoom = 12,
  className,
  height = "h-64",
  markers = [],
  onLocationSelect,
  showMarker = true,
  interactive = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine center coordinates
  const mapCenter = center || (latitude && longitude ? [longitude, latitude] : [-46.6333, -23.5505]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: mapCenter,
      zoom: zoom,
      interactive: interactive,
    });

    // Add navigation controls if interactive
    if (interactive) {
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );
    }

    // Handle map load
    map.current.on('load', () => {
      setIsLoading(false);
    });

    // Add click handler for location selection
    if (interactive && onLocationSelect) {
      map.current.on('click', async (e) => {
        const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        
        // Try to get address from reverse geocoding
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?` +
            new URLSearchParams({
              access_token: MAPBOX_ACCESS_TOKEN,
              country: 'BR',
              language: 'pt',
              limit: '1'
            })
          );

          if (response.ok) {
            const data = await response.json();
            const address = data.features?.[0]?.place_name;
            onLocationSelect(coordinates, address);
          } else {
            onLocationSelect(coordinates);
          }
        } catch (error) {
          console.error('Erro ao buscar endereço:', error);
          onLocationSelect(coordinates);
        }
      });
    }

    // Create single marker if needed
    if (showMarker && !markers.length) {
      marker.current = new mapboxgl.Marker({
        color: '#3B82F6',
        draggable: interactive
      })
        .setLngLat(mapCenter)
        .addTo(map.current);

      // Handle marker drag
      if (interactive && onLocationSelect && marker.current) {
        marker.current.on('dragend', async () => {
          if (!marker.current) return;
          
          const coordinates = marker.current.getLngLat();
          const coordsArray: [number, number] = [coordinates.lng, coordinates.lat];
          
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?` +
              new URLSearchParams({
                access_token: MAPBOX_ACCESS_TOKEN,
                country: 'BR',
                language: 'pt',
                limit: '1'
              })
            );

            if (response.ok) {
              const data = await response.json();
              const address = data.features?.[0]?.place_name;
              onLocationSelect(coordsArray, address);
            } else {
              onLocationSelect(coordsArray);
            }
          } catch (error) {
            console.error('Erro ao buscar endereço:', error);
            onLocationSelect(coordsArray);
          }
        });
      }
    }

    // Create multiple markers if provided
    if (markers.length > 0) {
      markersRef.current = markers.map(markerData => {
        const markerEl = new mapboxgl.Marker({
          color: '#EF4444'
        })
          .setLngLat([markerData.longitude, markerData.latitude])
          .addTo(map.current!);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-medium text-sm mb-1">${markerData.title}</h3>
              ${markerData.description ? `<p class="text-xs text-gray-600">${markerData.description}</p>` : ''}
            </div>
          `);
        
        markerEl.setPopup(popup);
        return markerEl;
      });

      // Fit map to markers
      if (markersRef.current.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach(marker => {
          bounds.extend([marker.longitude, marker.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map center and marker when center prop changes
  useEffect(() => {
    if (map.current && mapCenter) {
      map.current.setCenter(mapCenter);
      
      if (marker.current && !markers.length) {
        marker.current.setLngLat(mapCenter);
      } else if (showMarker && !markers.length && !marker.current) {
        marker.current = new mapboxgl.Marker({
          color: '#3B82F6',
          draggable: interactive
        })
          .setLngLat(mapCenter)
          .addTo(map.current);

        // Re-add drag handler
        if (interactive && onLocationSelect && marker.current) {
          marker.current.on('dragend', async () => {
            if (!marker.current) return;
            
            const coordinates = marker.current.getLngLat();
            const coordsArray: [number, number] = [coordinates.lng, coordinates.lat];
            
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?` +
                new URLSearchParams({
                  access_token: MAPBOX_ACCESS_TOKEN,
                  country: 'BR',
                  language: 'pt',
                  limit: '1'
                })
              );

              if (response.ok) {
                const data = await response.json();
                const address = data.features?.[0]?.place_name;
                onLocationSelect(coordsArray, address);
              } else {
                onLocationSelect(coordsArray);
              }
            } catch (error) {
              console.error('Erro ao buscar endereço:', error);
              onLocationSelect(coordsArray);
            }
          });
        }
      }
    }
  }, [mapCenter, showMarker, interactive, onLocationSelect, markers]);

  // Update markers when markers prop changes
  useEffect(() => {
    if (map.current && markers.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      
      // Create new markers
      markersRef.current = markers.map(markerData => {
        const markerEl = new mapboxgl.Marker({
          color: '#EF4444'
        })
          .setLngLat([markerData.longitude, markerData.latitude])
          .addTo(map.current!);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-medium text-sm mb-1">${markerData.title}</h3>
              ${markerData.description ? `<p class="text-xs text-gray-600">${markerData.description}</p>` : ''}
            </div>
          `);
        
        markerEl.setPopup(popup);
        return markerEl;
      });

      // Fit map to markers if multiple markers
      if (markersRef.current.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach(marker => {
          bounds.extend([marker.longitude, marker.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [markers]);

  return (
    <div className={cn("relative w-full rounded-lg overflow-hidden border", height, className)}>
      <div ref={mapContainer} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
            <span>Carregando mapa...</span>
          </div>
        </div>
      )}
      {interactive && onLocationSelect && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
          Clique ou arraste o marcador para selecionar a localização
        </div>
      )}
    </div>
  );
};

export default Map;