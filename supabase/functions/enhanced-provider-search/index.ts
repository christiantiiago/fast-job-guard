import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENHANCED-PROVIDER-SEARCH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting enhanced provider search");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

    logStep("Search parameters", { category, latitude, longitude, maxDistance, minRating, limit });

    // Build the query to get providers with their online status
    let query = supabaseClient
      .from('profiles')
      .select(`
        id,
        user_id,
        full_name,
        avatar_url,
        rating_avg,
        rating_count,
        created_at,
        verified_at,
        kyc_status,
        provider_status!inner(
          is_online,
          location_lat,
          location_lng,
          last_seen
        ),
        subscriptions!left(
          status
        ),
        services!inner(
          id,
          title,
          description,
          base_price,
          service_categories!inner(
            name,
            slug
          )
        )
      `)
      .eq('kyc_status', 'approved')
      .gte('rating_avg', minRating);

    // Add category filter if specified
    if (category) {
      query = query.eq('services.service_categories.slug', category);
    }

    const { data: rawProviders, error } = await query;

    if (error) {
      logStep("Database error", error);
      throw error;
    }

    logStep("Raw providers fetched", { count: rawProviders?.length });

    // Process and enhance the data
    const providers = rawProviders?.map(provider => {
      const providerStatus = Array.isArray(provider.provider_status) 
        ? provider.provider_status[0] 
        : provider.provider_status;
      
      const subscription = Array.isArray(provider.subscriptions) 
        ? provider.subscriptions[0] 
        : provider.subscriptions;

      let distance_km = 999999;
      let priority_score = 0;

      // Calculate distance if coordinates are provided
      if (latitude && longitude && providerStatus?.location_lat && providerStatus?.location_lng) {
        const R = 6371; // Earth's radius in km
        const dLat = (providerStatus.location_lat - latitude) * Math.PI / 180;
        const dLon = (providerStatus.location_lng - longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(providerStatus.location_lat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance_km = R * c;
      }

      // Calculate priority score
      const isPremium = subscription?.status === 'active';
      if (isPremium) priority_score += 1000;
      priority_score += Math.floor((provider.rating_avg || 0) * 20);
      if (distance_km < 999999) {
        priority_score += Math.max(0, 500 - Math.floor(distance_km * 10));
      }
      if (providerStatus?.is_online) priority_score += 200;

      return {
        id: provider.id,
        user_id: provider.user_id,
        full_name: provider.full_name,
        avatar_url: provider.avatar_url,
        rating_avg: provider.rating_avg || 0,
        rating_count: provider.rating_count || 0,
        is_premium: isPremium,
        is_online: providerStatus?.is_online || false,
        location_lat: providerStatus?.location_lat,
        location_lng: providerStatus?.location_lng,
        last_seen: providerStatus?.last_seen,
        distance_km,
        priority_score,
        services: Array.isArray(provider.services) ? provider.services : [provider.services].filter(Boolean),
        created_at: provider.created_at,
        verified_at: provider.verified_at,
        kyc_status: provider.kyc_status
      };
    }) || [];

    // Filter by distance and sort by priority
    const filteredProviders = providers
      .filter(provider => distance_km === 999999 || provider.distance_km <= maxDistance)
      .sort((a, b) => {
        // Premium first
        if (a.is_premium !== b.is_premium) return b.is_premium ? 1 : -1;
        // Online first
        if (a.is_online !== b.is_online) return b.is_online ? 1 : -1;
        // Then by priority score
        if (a.priority_score !== b.priority_score) return b.priority_score - a.priority_score;
        // Then by rating
        return (b.rating_avg || 0) - (a.rating_avg || 0);
      })
      .slice(0, limit);

    logStep("Processed providers", { count: filteredProviders.length });

    return new Response(JSON.stringify({
      providers: filteredProviders,
      metadata: {
        total: filteredProviders.length,
        hasLocation: latitude && longitude ? true : false
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in enhanced provider search", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});