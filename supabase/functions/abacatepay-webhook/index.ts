import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[ABACATEPAY-WEBHOOK] ${step}`, data || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    logStep('Webhook payload', body);

    // Validate webhook data
    if (!body || !body.data) {
      throw new Error("Invalid webhook payload");
    }

    const paymentData = body.data;
    const paymentId = paymentData.id;
    const status = paymentData.status;

    logStep('Processing webhook', { paymentId, status });

    // If payment is confirmed, trigger the processing function
    if (status === "CONFIRMED" || status === "PAID") {
      logStep('Payment confirmed, triggering full processing', { paymentId });
      
      // Call the check-abacatepay-payment function to process
      const { data, error } = await supabase.functions.invoke('check-abacatepay-payment', {
        body: { paymentId }
      });

      if (error) {
        logStep('Error calling processing function', error);
        throw error;
      }

      logStep('Processing function called successfully', data);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Webhook processed successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep('Webhook error', { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});