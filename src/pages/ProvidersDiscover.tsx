import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderMap } from '@/components/discover/ProviderMap';
import { DirectProposalModal } from '@/components/providers/DirectProposalModal';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Star, Filter, Navigation, MessageSquare, Circle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProviderDetailsCard } from '@/components/discover/ProviderDetailsCard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

interface MapMarker {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
}

export default function ProvidersDiscover() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [selectedProviderForProposal, setSelectedProviderForProposal] = useState<Provider | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { position, error: geoError } = useGeolocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const categories = [
    { slug: 'limpeza', name: 'Limpeza' },
    { slug: 'eletrica', name: 'Elétrica' },
    { slug: 'encanamento', name: 'Encanamento' },
    { slug: 'pintura', name: 'Pintura' },
    { slug: 'jardinagem', name: 'Jardinagem' },
  ];

  const searchProviders = async () => {
    try {
      setLoading(true);
      
      console.log('[PROVIDERS] Searching with params:', {
        category: selectedCategory || null,
        latitude: position?.latitude,
        longitude: position?.longitude,
        maxDistance: 20,
        minRating: 0,
        limit: 50
      });
      
      const { data, error } = await supabase.functions.invoke('enhanced-provider-search', {
        body: {
          category: selectedCategory || null,
          latitude: position?.latitude,
          longitude: position?.longitude,
          maxDistance: 20, // 20km de raio
          minRating: 0,
          limit: 50
        }
      });

      console.log('[PROVIDERS] API Response:', { data, error });

      if (error) throw error;

      // Process the data to ensure all required fields are present
      const processedProviders = (data?.providers || []).map((provider: any) => ({
        ...provider,
        is_online: provider.is_online || false,
        latitude: provider.address?.latitude || provider.latitude || null,
        longitude: provider.address?.longitude || provider.longitude || null,
        last_activity_minutes: provider.last_activity_minutes || null
      }));

      console.log('[PROVIDERS] Processed providers:', processedProviders);
      console.log('[PROVIDERS] Providers with coordinates:', 
        processedProviders.filter(p => p.latitude && p.longitude)
      );

      setProviders(processedProviders);
    } catch (error) {
      console.error('Erro ao buscar prestadores:', error);
      toast.error('Erro ao carregar prestadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (position) {
      searchProviders();
    }
  }, [position, selectedCategory]);

  const filteredProviders = providers.filter(provider =>
    !searchTerm || 
    provider.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.services.some((service: any) => 
      service.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useEffect(() => {
    console.log('[DEBUG] Providers state updated:', {
      totalProviders: providers.length,
      providersWithCoords: providers.filter(p => p.latitude && p.longitude).length,
      filteredProviders: filteredProviders.length,
      filteredWithCoords: filteredProviders.filter(p => p.latitude && p.longitude).length,
      position: position,
      sampleProvider: providers[0]
    });
  }, [providers, filteredProviders, position]);

  const formatLastActivity = (minutes: number | null) => {
    if (!minutes) return 'Nunca ativo';
    
    if (minutes < 1) return 'Online';
    if (minutes < 60) return `${minutes}min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  if (geoError) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Navigation className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Localização Necessária</h3>
              <p className="text-muted-foreground mb-4">
                Para mostrar prestadores próximos, precisamos acessar sua localização.
              </p>
              <Button onClick={() => window.location.reload()}>
                Permitir Localização
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Prestadores Próximos</h1>
          <p className="text-muted-foreground">
            Encontre prestadores de serviços na sua região
          </p>
        </div>

        {/* Filtros */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar prestadores ou serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap md:col-span-2">
            <Button
              variant={selectedCategory === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              Todos
            </Button>
            {categories.map(category => (
              <Button
                key={category.slug}
                variant={selectedCategory === category.slug ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Mapa */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Prestadores na sua região
                  <Badge variant="secondary" className="ml-auto">
                    {filteredProviders.filter(p => p.latitude && p.longitude).length} no mapa
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[70vh] min-h-[600px] rounded-b-lg overflow-hidden">
                  {position && (
                    <ProviderMap
                      providers={filteredProviders.filter(p => p.latitude && p.longitude)}
                      position={position}
                      onProviderSelect={(provider) => {
                        console.log('[PROVIDER] Selected provider:', provider);
                        setSelectedProvider(provider);
                      }}
                    />
                  )}
                  {!position && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <div className="animate-pulse">
                          <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">Obtendo sua localização...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Prestadores */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {filteredProviders.length} prestadores encontrados
                {filteredProviders.filter(p => p.latitude && p.longitude).length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({filteredProviders.filter(p => p.latitude && p.longitude).length} no mapa)
                  </span>
                )}
              </h3>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            <div className="space-y-3 max-h-[70vh] min-h-[600px] overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                filteredProviders.map(provider => (
                  <Card key={provider.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            {provider.avatar_url ? (
                              <AvatarImage 
                                src={provider.avatar_url} 
                                alt={provider.full_name}
                                className="object-cover"
                              />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {provider.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1">
                            <div 
                              className={`h-4 w-4 rounded-full border-2 border-white ${
                                provider.is_online ? 'bg-green-500' : 'bg-gray-400'
                              }`} 
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{provider.full_name}</h4>
                            {provider.is_premium && (
                              <Badge variant="secondary" className="text-xs">Premium</Badge>
                            )}
                            <Badge 
                              variant={provider.is_online ? "default" : "secondary"} 
                              className={`text-xs ${provider.is_online ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
                            >
                              {formatLastActivity(provider.last_activity_minutes)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                              <span>{provider.rating_avg.toFixed(1)}</span>
                              <span>({provider.rating_count})</span>
                            </div>
                            
                            {provider.distance_km < 999999 && (
                              <>
                                <span>•</span>
                                <span>{provider.distance_km.toFixed(1)}km</span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {provider.services.slice(0, 2).map(service => (
                              <Badge key={service.id} variant="outline" className="text-xs">
                                {service.title}
                              </Badge>
                            ))}
                            {provider.services.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{provider.services.length - 2}
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProvider(provider);
                                setDetailsModalOpen(true);
                              }}
                              className="text-xs"
                            >
                              Ver Detalhes
                            </Button>
                            {user && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedProviderForProposal(provider);
                                  setProposalModalOpen(true);
                                }}
                                className="text-xs"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Contratar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <ProviderDetailsCard
          provider={selectedProvider}
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedProvider(null);
          }}
          onViewProfile={(provider) => navigate(`/user/${provider.user_id}`)}
          onDirectContract={(provider) => {
            setSelectedProviderForProposal(provider);
            setProposalModalOpen(true);
            setDetailsModalOpen(false);
          }}
        />

        <DirectProposalModal
          provider={selectedProviderForProposal}
          isOpen={proposalModalOpen}
          onClose={() => {
            setProposalModalOpen(false);
            setSelectedProviderForProposal(null);
          }}
          onSuccess={() => {
            // Could refetch data or show success message
          }}
        />
      </div>
    </AppLayout>
  );
}