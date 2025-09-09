import { useState, useEffect } from 'react';

interface Position {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  position: Position | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: 'Geolocalização não é suportada pelo navegador',
        loading: false,
      });
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        error: null,
        loading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'Erro ao obter localização';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permissão de localização negada';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Localização indisponível';
          break;
        case error.TIMEOUT:
          errorMessage = 'Timeout ao obter localização';
          break;
      }

      setState({
        position: null,
        error: errorMessage,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    });
  }, []);

  return state;
};

// Função para calcular distância usando Haversine formula (distância em linha reta)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Função para calcular distância de rota precisa usando Mapbox Directions API
export const calculateRouteDistance = async (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  mapboxToken?: string
): Promise<{ distance: number; duration: number } | null> => {
  if (!mapboxToken) {
    // Fallback para distância em linha reta se não houver token
    return {
      distance: calculateDistance(startLat, startLon, endLat, endLon),
      duration: 0
    };
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${startLon},${startLat};${endLon},${endLat}?access_token=${mapboxToken}&geometries=geojson`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance / 1000, // Converter de metros para km
        duration: route.duration // Em segundos
      };
    }

    // Fallback para distância em linha reta
    return {
      distance: calculateDistance(startLat, startLon, endLat, endLon),
      duration: 0
    };
  } catch (error) {
    console.error('[ROUTE] Erro ao calcular rota:', error);
    // Fallback para distância em linha reta
    return {
      distance: calculateDistance(startLat, startLon, endLat, endLon),
      duration: 0
    };
  }
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
};

export const formatDuration = (duration: number): string => {
  if (duration === 0) return '';
  
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
};