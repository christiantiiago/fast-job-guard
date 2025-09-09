import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Provider {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_premium: boolean;
  priority_score: number;
  distance_km: number | null;
  services: Array<{
    id: string;
    title: string;
    description: string;
    base_price: number;
    category: {
      name: string;
      slug: string;
    };
  }>;
}

interface SearchFilters {
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  maxDistance?: number;
  minRating?: number;
  maxPrice?: number;
  premiumOnly?: boolean;
}

export const useProviderSearch = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchProviders = async (filters: SearchFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Construir query otimizada com priorização premium
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          avatar_url,
          rating_avg,
          rating_count,
          services!inner(
            id,
            title,
            description,
            base_price,
            service_categories!inner(
              name,
              slug
            )
          ),
          subscriptions(
            status,
            plan_name
          )
        `)
        .eq('services.is_active', true);

      // Filtrar por categoria se especificado
      if (filters.category) {
        query = query.eq('services.service_categories.slug', filters.category);
      }

      // Filtrar por rating mínimo
      if (filters.minRating) {
        query = query.gte('rating_avg', filters.minRating);
      }

      // Executar query
      const { data: providersData, error: providersError } = await query;

      if (providersError) throw providersError;

      // Processar dados e calcular prioridade
      const processedProviders: Provider[] = await Promise.all(
        (providersData || []).map(async (provider: any) => {
          const isPremium = provider.subscriptions?.some((sub: any) => sub.status === 'active') || false;
          
          let priorityScore = 0;
          let distanceKm: number | null = null;

          // Calcular prioridade usando a função do banco
          if (filters.location) {
            try {
              const { data: priorityData } = await supabase.rpc('calculate_provider_priority', {
                provider_user_id: provider.user_id,
                job_latitude: filters.location.latitude,
                job_longitude: filters.location.longitude
              });
              
              if (priorityData !== null) {
                priorityScore = priorityData;
              }
            } catch (err) {
              console.error('Error calculating priority:', err);
            }
          } else {
            // Sem localização, apenas premium e rating
            if (isPremium) priorityScore += 1000;
            priorityScore += Math.floor((provider.rating_avg || 0) * 20);
          }

          return {
            id: provider.id,
            user_id: provider.user_id,
            full_name: provider.full_name || 'Prestador',
            avatar_url: provider.avatar_url,
            rating_avg: provider.rating_avg || 0,
            rating_count: provider.rating_count || 0,
            is_premium: isPremium,
            priority_score: priorityScore,
            distance_km: distanceKm,
            services: provider.services.map((service: any) => ({
              id: service.id,
              title: service.title,
              description: service.description,
              base_price: service.base_price,
              category: {
                name: service.service_categories.name,
                slug: service.service_categories.slug
              }
            }))
          };
        })
      );

      // Filtros finais no cliente
      let filteredProviders = processedProviders;

      if (filters.premiumOnly) {
        filteredProviders = filteredProviders.filter(p => p.is_premium);
      }

      if (filters.maxPrice) {
        filteredProviders = filteredProviders.filter(p => 
          p.services.some(s => (s.base_price || 0) <= filters.maxPrice!)
        );
      }

      // Ordenar por prioridade (premium primeiro, depois rating, depois distância)
      filteredProviders.sort((a, b) => {
        // Primeiro por status premium
        if (a.is_premium && !b.is_premium) return -1;
        if (!a.is_premium && b.is_premium) return 1;
        
        // Depois por score de prioridade
        if (b.priority_score !== a.priority_score) {
          return b.priority_score - a.priority_score;
        }
        
        // Por último, por rating
        return (b.rating_avg || 0) - (a.rating_avg || 0);
      });

      setProviders(filteredProviders);

      console.log('[PROVIDER-SEARCH] Found providers:', {
        total: filteredProviders.length,
        premium: filteredProviders.filter(p => p.is_premium).length,
        filters
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na busca';
      setError(errorMessage);
      toast({
        title: "Erro na busca",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('[PROVIDER-SEARCH] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    providers,
    loading,
    error,
    searchProviders,
    refetch: () => searchProviders()
  };
};