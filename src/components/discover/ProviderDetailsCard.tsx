import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Star, 
  MapPin, 
  MessageSquare, 
  Eye, 
  Clock, 
  CheckCircle,
  Award,
  Shield,
  Zap,
  Crown
} from 'lucide-react';

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
  address?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

interface ProviderDetailsCardProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (provider: Provider) => void;
  onDirectContract: (provider: Provider) => void;
}

export const ProviderDetailsCard = ({ 
  provider, 
  isOpen, 
  onClose, 
  onViewProfile, 
  onDirectContract 
}: ProviderDetailsCardProps) => {
  if (!provider) return null;

  const formatLastActivity = (minutes: number | null) => {
    if (!minutes) return 'Nunca ativo';
    
    if (minutes < 1) return 'Online';
    if (minutes < 60) return `${Math.floor(minutes)}min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const getActivityColor = (minutes: number | null) => {
    if (!minutes || minutes < 5) return 'text-green-600';
    if (minutes < 60) return 'text-yellow-600';
    if (minutes < 1440) return 'text-orange-600';
    return 'text-red-600';
  };

  const getActivityStatus = (minutes: number | null) => {
    if (!minutes || minutes < 5) return 'online';
    if (minutes < 60) return 'recent';
    if (minutes < 1440) return 'idle';
    return 'offline';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Detalhes do Prestador</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Provider Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                {provider.avatar_url ? (
                  <AvatarImage 
                    src={provider.avatar_url} 
                    alt={provider.full_name}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                    {provider.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* Activity indicator */}
              <div className="absolute -bottom-1 -right-1">
                <div 
                  className={`h-6 w-6 rounded-full border-3 border-white shadow-sm flex items-center justify-center ${
                    getActivityStatus(provider.last_activity_minutes) === 'online' 
                      ? 'bg-green-500' 
                      : getActivityStatus(provider.last_activity_minutes) === 'recent'
                        ? 'bg-yellow-500'
                        : getActivityStatus(provider.last_activity_minutes) === 'idle'
                          ? 'bg-orange-500'
                          : 'bg-gray-400'
                  }`}
                >
                  {getActivityStatus(provider.last_activity_minutes) === 'online' && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-xl font-semibold">{provider.full_name}</h3>
                {provider.is_premium && (
                  <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <span className="font-medium">{provider.rating_avg.toFixed(1)}</span>
                <span className="text-muted-foreground">({provider.rating_count} avaliações)</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-sm font-medium">{provider.distance_km.toFixed(1)}km</div>
              <div className="text-xs text-muted-foreground">de distância</div>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className={`h-5 w-5 mx-auto mb-1 ${getActivityColor(provider.last_activity_minutes)}`} />
              <div className="text-sm font-medium">{formatLastActivity(provider.last_activity_minutes)}</div>
              <div className="text-xs text-muted-foreground">última atividade</div>
            </div>
          </div>

          {/* Location */}
          {provider.address && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {provider.address.neighborhood && `${provider.address.neighborhood}, `}
                {provider.address.city} - {provider.address.state}
              </p>
            </div>
          )}

          {/* Services */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Serviços Oferecidos</h4>
            <div className="flex flex-wrap gap-2">
              {provider.services.map((service, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service.title}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => onViewProfile(provider)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver Perfil
            </Button>
            <Button 
              onClick={() => onDirectContract(provider)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4" />
              Contratar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};