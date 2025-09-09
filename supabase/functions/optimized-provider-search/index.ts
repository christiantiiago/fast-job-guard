import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { 
      category, 
      latitude, 
      longitude, 
      maxDistance = 50, 
      minRating = 0, 
      limit = 20 
    } = await req.json();

    console.log('[PROVIDER-SEARCH] Starting optimized search:', {
      category,
      latitude,
      longitude,
      maxDistance,
      minRating,
      limit
    });

    // Query otimizada usando a função de prioridade criada anteriormente
    const { data: providers, error } = await supabase
      .rpc('search_providers_optimized', {
        p_category: category,
        p_latitude: latitude,
        p_longitude: longitude,
        p_max_distance: maxDistance,
        p_min_rating: minRating,
        p_limit: limit
      });

    if (error) {
      console.error('[PROVIDER-SEARCH] Database error:', error);
      throw error;
    }

    console.log('[PROVIDER-SEARCH] Found providers:', {
      count: providers?.length || 0,
      premiumCount: providers?.filter((p: any) => p.is_premium).length || 0
    });

    // Processar resultados para incluir prioridade e dados completos
    const processedProviders = (providers || []).map((provider: any) => {
      return {
        id: provider.id,
        user_id: provider.user_id,
        full_name: provider.full_name || 'Prestador',
        avatar_url: provider.avatar_url,
        rating_avg: provider.rating_avg || 0,
        rating_count: provider.rating_count || 0,
        is_premium: provider.is_premium || false,
        priority_score: provider.priority_score || 0,
        distance_km: provider.distance_km,
        services: provider.services || [],
        badge_premium: provider.is_premium,
        created_at: provider.created_at,
        verified_at: provider.verified_at,
        kyc_status: provider.kyc_status
      };
    });

    return new Response(JSON.stringify({
      providers: processedProviders,
      meta: {
        total: processedProviders.length,
        premium_count: processedProviders.filter(p => p.is_premium).length,
        search_params: {
          category,
          latitude,
          longitude,
          maxDistance,
          minRating
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[PROVIDER-SEARCH] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      providers: [],
      meta: { total: 0, premium_count: 0 }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});