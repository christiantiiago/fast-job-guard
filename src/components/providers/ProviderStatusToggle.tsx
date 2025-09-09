import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProviderStatus } from '@/hooks/useProviderStatus';
import { Circle, MapPin, Clock } from 'lucide-react';

export const ProviderStatusToggle = () => {
  const { isOnline, loading, goOnline, goOffline } = useProviderStatus();

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <Circle className={`h-3 w-3 ${isOnline ? 'text-green-500 fill-current' : 'text-gray-400 fill-current'}`} />
        <Badge variant={isOnline ? "default" : "secondary"} className={isOnline ? 'bg-green-500' : 'bg-gray-400'}>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium">
          {isOnline ? 'Você está visível para clientes' : 'Você está offline'}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {isOnline ? 'Localização sendo compartilhada' : 'Localização não compartilhada'}
        </div>
      </div>

      <Button
        size="sm"
        variant={isOnline ? "outline" : "default"}
        onClick={isOnline ? goOffline : goOnline}
        disabled={loading}
        className="shrink-0"
      >
        {loading ? (
          <Clock className="h-4 w-4 animate-spin" />
        ) : (
          isOnline ? 'Ficar Offline' : 'Ficar Online'
        )}
      </Button>
    </div>
  );
};