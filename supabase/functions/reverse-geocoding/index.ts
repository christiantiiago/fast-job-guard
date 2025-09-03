import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { longitude, latitude } = await req.json();

    if (!longitude || !latitude) {
      return new Response(
        JSON.stringify({ error: 'Longitude and latitude are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const MAPBOX_ACCESS_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('Mapbox access token not found');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
      new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
        language: 'pt',
        types: 'address'
      })
    );

    if (!response.ok) {
      console.error('Mapbox reverse geocoding API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Reverse geocoding service unavailable' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    const data = await response.json();
    const address = data.features?.[0]?.place_name || '';

    return new Response(
      JSON.stringify({ address }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in reverse geocoding function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
});