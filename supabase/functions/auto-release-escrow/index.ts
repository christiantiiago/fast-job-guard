import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RELEASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting auto-release process");

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find all escrow payments that are eligible for auto-release
    const { data: eligiblePayments, error: queryError } = await supabaseClient
      .from("escrow_payments")
      .select(`
        id,
        job_id,
        client_id,
        provider_id,
        amount,
        platform_fee,
        release_date,
        status
      `)
      .eq("status", "held")
      .lt("release_date", new Date().toISOString())
      .limit(50); // Process in batches

    if (queryError) {
      throw queryError;
    }

    if (!eligiblePayments || eligiblePayments.length === 0) {
      logStep("No payments eligible for auto-release");
      return new Response(JSON.stringify({ 
        message: "No payments eligible for auto-release",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found eligible payments", { count: eligiblePayments.length });

    let processedCount = 0;
    let errors: any[] = [];

    // Process each eligible payment
    for (const payment of eligiblePayments) {
      try {
        logStep("Processing payment", { paymentId: payment.id });

        // Call the release-escrow-payment function
        const releaseResponse = await supabaseClient.functions.invoke('release-escrow-payment', {
          body: {
            escrowPaymentId: payment.id,
            releaseType: 'auto'
          }
        });

        if (releaseResponse.error) {
          logStep("Error releasing payment", { 
            paymentId: payment.id, 
            error: releaseResponse.error 
          });
          errors.push({
            paymentId: payment.id,
            error: releaseResponse.error
          });
        } else {
          processedCount++;
          logStep("Payment released successfully", { paymentId: payment.id });
        }

      } catch (error) {
        logStep("Exception processing payment", { 
          paymentId: payment.id, 
          error: error 
        });
        errors.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logStep("Auto-release process completed", { 
      total: eligiblePayments.length,
      processed: processedCount,
      errors: errors.length
    });

    return new Response(JSON.stringify({
      message: "Auto-release process completed",
      total: eligiblePayments.length,
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in auto-release process", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});