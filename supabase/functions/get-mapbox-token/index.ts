import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Fetching MAPBOX_ACCESS_TOKEN from environment...')
    const token = Deno.env.get('MAPBOX_ACCESS_TOKEN')
    
    if (!token) {
      console.error('MAPBOX_ACCESS_TOKEN not configured in Supabase secrets')
      return new Response(
        JSON.stringify({ 
          error: 'Mapbox token not configured',
          message: 'Please add MAPBOX_ACCESS_TOKEN to Supabase Edge Function Secrets'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('MAPBOX_ACCESS_TOKEN found, returning token')
    return new Response(
      JSON.stringify({ token }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error getting Mapbox token:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})