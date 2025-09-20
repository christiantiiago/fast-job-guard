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

    // Simplified query - fetch profiles first, then get related data
    const { data: profiles, error: profilesError } = await supabaseClient
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
        kyc_status
      `)
      .eq('kyc_status', 'approved')
      .gte('rating_avg', minRating);

    if (profilesError) {
      logStep("Profiles query error", profilesError);
      throw new Error(`Profile query failed: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      logStep("No approved profiles found");
      return new Response(JSON.stringify({
        providers: [],
        metadata: { total: 0, hasLocation: !!latitude && !!longitude }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get services for each profile
    const { data: services, error: servicesError } = await supabaseClient
      .from('services')
      .select(`
        id,
        title,
        description,
        base_price,
        provider_id,
        service_categories(name, slug)
      `)
      .in('provider_id', profiles.map(p => p.user_id))
      .eq('is_active', true);

    if (servicesError) {
      logStep("Services query error", servicesError);
    }

    // Get addresses for each profile
    const { data: addresses, error: addressesError } = await supabaseClient
      .from('addresses')
      .select('*')
      .in('user_id', profiles.map(p => p.user_id));

    if (addressesError) {
      logStep("Addresses query error", addressesError);
    }

    // Get subscriptions for premium status
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select('user_id, status')
      .in('user_id', profiles.map(p => p.user_id))
      .eq('status', 'active');

    if (subscriptionsError) {
      logStep("Subscriptions query error", subscriptionsError);
    }

    logStep("Data fetched", { 
      profilesCount: profiles?.length,
      servicesCount: services?.length,
      addressesCount: addresses?.length,
      subscriptionsCount: subscriptions?.length
    });

    // Process and enhance the data
    const providers = profiles.map(profile => {
      const profileServices = services?.filter(s => s.provider_id === profile.user_id) || [];
      const profileAddresses = addresses?.filter(a => a.user_id === profile.user_id) || [];
      const primaryAddress = profileAddresses.find(addr => addr.is_primary) || profileAddresses[0];
      const subscription = subscriptions?.find(s => s.user_id === profile.user_id);
      
      // Filter by category if specified
      if (category) {
        const hasCategory = profileServices.some(service => 
          service.service_categories?.slug === category
        );
        if (!hasCategory) return null;
      }

      let distance_km = 999999;
      let priority_score = 0;

      // Calculate distance if coordinates are provided
      if (latitude && longitude && primaryAddress?.latitude && primaryAddress?.longitude) {
        const R = 6371; // Earth's radius in km
        const dLat = (primaryAddress.latitude - latitude) * Math.PI / 180;
        const dLon = (primaryAddress.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(primaryAddress.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance_km = R * c;
      }

      // Calculate priority score
      const isPremium = subscription?.status === 'active';
      if (isPremium) priority_score += 1000;
      priority_score += Math.floor((profile.rating_avg || 0) * 20);
      if (distance_km < 999999) {
        priority_score += Math.max(0, 500 - Math.floor(distance_km * 10));
      }

      return {
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        rating_avg: profile.rating_avg || 0,
        rating_count: profile.rating_count || 0,
        is_premium: isPremium || false,
        address: primaryAddress ? {
          street: primaryAddress.street,
          number: primaryAddress.number,
          neighborhood: primaryAddress.neighborhood,
          city: primaryAddress.city,
          state: primaryAddress.state,
          latitude: primaryAddress.latitude,
          longitude: primaryAddress.longitude
        } : null,
        distance_km,
        priority_score,
        services: profileServices.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          base_price: s.base_price,
          category: s.service_categories
        })),
        created_at: profile.created_at,
        verified_at: profile.verified_at,
        kyc_status: profile.kyc_status
      };
    }).filter(Boolean); // Remove nulls from category filtering

    // Filter by distance and sort by priority
    const filteredProviders = providers
      .filter(provider => provider.distance_km <= maxDistance)
      .sort((a, b) => {
        // Premium first
        if (a.is_premium !== b.is_premium) return b.is_premium ? 1 : -1;
        // Then by distance (closer first)
        if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
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
    const errorStack = error instanceof Error ? error.stack : '';
    logStep("ERROR in enhanced provider search", { message: errorMessage, stack: errorStack });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});