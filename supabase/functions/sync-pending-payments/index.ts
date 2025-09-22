import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[SYNC-PENDING-PAYMENTS] ${step}`, data || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting sync of pending payments');
    
    // Use service role client for all operations
    const serviceRoleClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get AbacatePay API key
    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    // Find all pending escrow payments older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: pendingPayments, error } = await serviceRoleClient
      .from("escrow_payments")
      .select("id, external_payment_id, amount, job_id, client_id, provider_id, created_at")
      .eq("status", "pending")
      .lt("created_at", twoMinutesAgo)
      .limit(50);

    if (error) {
      logStep("Error fetching pending payments", error);
      throw error;
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      logStep("No pending payments found to sync");
      return new Response(JSON.stringify({
        success: true,
        message: "No pending payments to sync",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep(`Found ${pendingPayments.length} pending payments to check`);

    let processedCount = 0;
    const results = [];

    for (const payment of pendingPayments) {
      try {
        if (!payment.external_payment_id) {
          logStep(`Skipping payment without external_payment_id`, { paymentId: payment.id });
          continue;
        }

        logStep(`Checking payment with AbacatePay`, { 
          paymentId: payment.id, 
          externalId: payment.external_payment_id 
        });

        // Check with AbacatePay API
        const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${payment.external_payment_id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${abacatePayApiKey}`,
          }
        });

        if (!abacateResponse.ok) {
          logStep(`AbacatePay API error for payment`, { 
            paymentId: payment.id,
            status: abacateResponse.status 
          });
          continue;
        }

        const abacateData = await abacateResponse.json();
        const isPaid = abacateData.data?.status === "CONFIRMED" || abacateData.data?.status === "PAID";

        if (isPaid) {
          logStep(`Payment confirmed, processing`, { paymentId: payment.id });

          // Call the full processing function
          const processResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-abacatepay-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({ paymentId: payment.external_payment_id })
          });

          if (processResponse.ok) {
            processedCount++;
            results.push({
              paymentId: payment.id,
              externalId: payment.external_payment_id,
              status: 'processed'
            });
            logStep(`Successfully processed payment`, { paymentId: payment.id });
          } else {
            logStep(`Error processing payment`, { 
              paymentId: payment.id,
              status: processResponse.status 
            });
          }
        } else {
          logStep(`Payment not yet confirmed`, { 
            paymentId: payment.id,
            status: abacateData.data?.status 
          });
        }

      } catch (paymentError) {
        logStep(`Error checking individual payment`, { 
          paymentId: payment.id,
          error: paymentError.message 
        });
      }
    }

    logStep(`Sync completed`, { 
      totalChecked: pendingPayments.length,
      processed: processedCount 
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Checked ${pendingPayments.length} payments, processed ${processedCount}`,
      processed: processedCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep('Error in sync process', { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});