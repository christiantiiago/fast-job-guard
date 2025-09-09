import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useProviderStatus = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateStatus = async (online: boolean, latitude?: number, longitude?: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('update-provider-status', {
        body: {
          isOnline: online,
          latitude,
          longitude
        }
      });

      if (error) throw error;
      setIsOnline(online);
    } catch (error) {
      console.error('Error updating provider status:', error);
    } finally {
      setLoading(false);
    }
  };

  const goOnline = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateStatus(true, position.coords.latitude, position.coords.longitude);
        },
        () => {
          updateStatus(true);
        }
      );
    } else {
      updateStatus(true);
    }
  };

  const goOffline = async () => {
    updateStatus(false);
  };

  // Auto update location every 5 minutes when online
  useEffect(() => {
    if (!isOnline || !user) return;

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            updateStatus(true, position.coords.latitude, position.coords.longitude);
          },
          () => {
            // If geolocation fails, just update the online status
            updateStatus(true);
          }
        );
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isOnline, user]);

  return {
    isOnline,
    loading,
    goOnline,
    goOffline
  };
};