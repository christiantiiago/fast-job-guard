import React, { useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: Array<{
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
  }>;
  style?: 'light' | 'dark' | 'streets' | 'satellite';
  className?: string;
  height?: string;
}

const Map: React.FC<MapProps> = ({
  latitude = -14.2350,  // Centro do Brasil
  longitude = -51.9253,
  zoom = 4,
  markers = [],
  style = 'light',
  className = '',
  height = '400px'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Memoize markers to prevent unnecessary re-renders
  const memoizedMarkers = useMemo(() => markers, [
    JSON.stringify(markers.map(m => ({ lat: m.latitude, lng: m.longitude, title: m.title })))
  ]);

  const getMapStyle = (styleType: string) => {
    const styles = {
      light: 'mapbox://styles/mapbox/light-v11',
      dark: 'mapbox://styles/mapbox/dark-v11', 
      streets: 'mapbox://styles/mapbox/streets-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
    };
    return styles[styleType as keyof typeof styles] || styles.light;
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with your provided token
    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXN0aWFudGlhZ28iLCJhIjoiY21ic3NvYTRlMDZrMDJscHRtOHk2c3l6YyJ9.-hRvBI4Ie6wvbNFgtc1IHw';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(style),
      center: [longitude, latitude],
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add markers
    memoizedMarkers.forEach((marker) => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2">
          <h3 class="font-semibold text-sm">${marker.title || 'Localização'}</h3>
          ${marker.description ? `<p class="text-xs text-muted-foreground mt-1">${marker.description}</p>` : ''}
        </div>`
      );

      const markerElement = new mapboxgl.Marker({
        color: 'hsl(8 84% 60%)', // Primary color from theme
      })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(markerElement);
    });

    // Cleanup
    return () => {
      // Remove markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      // Remove map
      map.current?.remove();
    };
  }, [latitude, longitude, zoom, memoizedMarkers, style]);

  return (
    <div 
      ref={mapContainer} 
      className={`w-full rounded-lg shadow-sm ${className}`}
      style={{ height }}
    />
  );
};

export default Map;