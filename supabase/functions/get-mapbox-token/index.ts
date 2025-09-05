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
    // Return the updated token
    const token = 'pk.eyJ1IjoiY2hyaXN0aWFudGlhZ28iLCJhIjoiY21ic3NvYTRlMDZrMDJscHRtOHk2c3l6YyJ9.-hRvBI4Ie6wvbNFgtc1IHw';
    
    return new Response(
      JSON.stringify({ token }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error:', error)
    // Return fallback token
    return new Response(
      JSON.stringify({ 
        token: 'pk.eyJ1IjoiY2hyaXN0aWFudGlhZ28iLCJhIjoiY21ic3NvYTRlMDZrMDJscHRtOHk2c3l6YyJ9.-hRvBI4Ie6wvbNFgtc1IHw'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})