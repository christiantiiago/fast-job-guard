import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RELEASE-ESCROW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting auto-release escrow job");

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();
    logStep("Current time", { now: now.toISOString() });

    // Find escrow payments that are ready for auto-release (5 days have passed)
    const { data: escrowPayments, error: escrowError } = await supabaseClient
      .from("escrow_payments")
      .select("*")
      .eq("status", "held")
      .lt("release_date", now.toISOString());

    if (escrowError) {
      throw escrowError;
    }

    logStep("Found escrow payments to release", { count: escrowPayments?.length || 0 });

    if (!escrowPayments || escrowPayments.length === 0) {
      return new Response(JSON.stringify({
        message: "No escrow payments ready for auto-release",
        released: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let releasedCount = 0;

    for (const escrowPayment of escrowPayments) {
      try {
        logStep("Processing escrow payment", { id: escrowPayment.id });

        // Update escrow payment status to released
        const { error: updateError } = await supabaseClient
          .from("escrow_payments")
          .update({ 
            status: "released",
            completed_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq("id", escrowPayment.id);

        if (updateError) {
          logStep("Error updating escrow payment", updateError);
          continue;
        }

        // Create notifications
        await supabaseClient
          .from("notifications")
          .insert([
            {
              user_id: escrowPayment.provider_id,
              title: "Pagamento Liberado Automaticamente",
              message: `O pagamento de R$ ${escrowPayment.amount.toFixed(2)} foi liberado automaticamente após 5 dias.`,
              type: "payment_released",
              data: { 
                escrowPaymentId: escrowPayment.id,
                amount: escrowPayment.amount,
                releaseType: 'auto',
                jobId: escrowPayment.job_id 
              }
            },
            {
              user_id: escrowPayment.client_id,
              title: "Pagamento Liberado Automaticamente",
              message: "O pagamento foi liberado automaticamente após o prazo de 5 dias.",
              type: "payment_released",
              data: { 
                escrowPaymentId: escrowPayment.id,
                amount: escrowPayment.amount,
                releaseType: 'auto',
                jobId: escrowPayment.job_id 
              }
            }
          ]);

        logStep("Escrow payment auto-released", { id: escrowPayment.id });
        releasedCount++;

      } catch (error) {
        logStep("Error processing escrow payment", { 
          id: escrowPayment.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    logStep("Auto-release job completed", { releasedCount });

    return new Response(JSON.stringify({
      message: `Auto-released ${releasedCount} escrow payments`,
      released: releasedCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in auto-release job", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});