import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[PAYMENT-FALLBACK] ${step}`, data || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting fallback payment processing');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar payments pendentes há mais de 2 minutos
    const twoMinutesAgo = new Date();
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

    const { data: pendingPayments, error: queryError } = await supabaseClient
      .from("escrow_payments")
      .select("external_payment_id")
      .eq("status", "pending")
      .lt("created_at", twoMinutesAgo.toISOString());

    if (queryError) {
      logStep('Error querying pending payments', queryError);
      throw queryError;
    }

    logStep('Found pending payments to check', { count: pendingPayments?.length || 0 });

    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending payments to process",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    let processedCount = 0;
    
    // Processar cada pagamento pendente
    for (const payment of pendingPayments) {
      if (!payment.external_payment_id) continue;

      try {
        logStep('Checking payment with AbacatePay', { paymentId: payment.external_payment_id });

        // Verificar status no AbacatePay
        const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${payment.external_payment_id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${abacatePayApiKey}`,
          }
        });

        if (!abacateResponse.ok) {
          logStep('AbacatePay API error', { 
            paymentId: payment.external_payment_id,
            status: abacateResponse.status 
          });
          continue;
        }

        const abacateData = await abacateResponse.json();
        const isPaid = abacateData.data?.status === "CONFIRMED" || abacateData.data?.status === "PAID";
        
        if (isPaid) {
          logStep('Payment confirmed in fallback, calling check function', { paymentId: payment.external_payment_id });
          
          // Chamar função de processamento
          const { error: processError } = await supabaseClient.functions.invoke('check-abacatepay-payment', {
            body: { paymentId: payment.external_payment_id }
          });

          if (processError) {
            logStep('Error processing payment', { paymentId: payment.external_payment_id, error: processError });
          } else {
            processedCount++;
            logStep('Payment processed successfully in fallback', { paymentId: payment.external_payment_id });
          }
        }
      } catch (error) {
        logStep('Error processing individual payment', { 
          paymentId: payment.external_payment_id, 
          error: error.message 
        });
      }
    }

    logStep('Fallback processing completed', { processed: processedCount, total: pendingPayments.length });

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      total: pendingPayments.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep('Error in fallback processing', { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});