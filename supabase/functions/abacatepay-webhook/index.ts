import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATEPAY-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("ABACATEPAY_API_KEY is not set");
    }
    
    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    logStep("Webhook body received", body);

    const { data: webhookData } = body;
    
    if (!webhookData || !webhookData.id) {
      logStep("Invalid webhook data", { webhookData });
      return new Response(JSON.stringify({ error: "Invalid webhook data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const paymentId = webhookData.id;
    const status = webhookData.status;
    
    logStep("Processing webhook", { paymentId, status });

    // Check if payment was confirmed
    if (status === "CONFIRMED" || status === "PAID") {
      logStep("Payment confirmed, processing...", { paymentId, status });

      // Find records with this external payment ID
      const { data: escrowPayments, error: escrowError } = await supabaseClient
        .from("escrow_payments")
        .select("*, jobs:job_id(id, client_id, provider_id, status)")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (escrowError) {
        logStep("Error finding escrow payments", escrowError);
      } else if (escrowPayments && escrowPayments.length > 0) {
        logStep("Found escrow payments to process", { count: escrowPayments.length });
        
        for (const escrow of escrowPayments) {
          logStep("Processing escrow payment", { escrowId: escrow.id, jobId: escrow.job_id });
          
          // Update escrow payment to "held" status
          const releaseDate = new Date();
          releaseDate.setDate(releaseDate.getDate() + 5); // 5 dias para liberação automática

          const { error: updateError } = await supabaseClient
            .from("escrow_payments")
            .update({ 
              status: "held",
              release_date: releaseDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", escrow.id);

          if (updateError) {
            logStep("Error updating escrow payment", updateError);
            continue;
          }
          
          logStep("Escrow payment updated to held", { escrowId: escrow.id });

          // Update job status to in_progress and assign provider
          if (escrow.job_id && escrow.provider_id) {
            const { error: jobUpdateError } = await supabaseClient
              .from("jobs")
              .update({ 
                status: "in_progress",
                provider_id: escrow.provider_id,
                final_price: escrow.amount,
                updated_at: new Date().toISOString()
              })
              .eq("id", escrow.job_id);

            if (jobUpdateError) {
              logStep("Error updating job status", jobUpdateError);
            } else {
              logStep("Job status updated to in_progress", { 
                jobId: escrow.job_id, 
                providerId: escrow.provider_id,
                finalPrice: escrow.amount 
              });
            }
          }

            // Create notifications
            await supabaseClient
              .from("notifications")
              .insert([
                {
                  user_id: escrow.provider_id,
                  title: "Pagamento Confirmado",
                  message: "O pagamento foi confirmado e está em garantia. Você pode iniciar o trabalho.",
                  type: "payment_confirmed",
                  data: { escrowId: escrow.id, paymentId }
                },
                {
                  user_id: escrow.client_id,
                  title: "Pagamento Confirmado",
                  message: "Seu pagamento foi confirmado e está protegido em garantia.",
                  type: "payment_confirmed",
                  data: { escrowId: escrow.id, paymentId }
                }
              ]);

            logStep("Notifications created for escrow payment");
          }
        }
      }

      // Check for job boosts
      const { data: jobBoosts, error: boostError } = await supabaseClient
        .from("job_boosts")
        .select("*")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (boostError) {
        logStep("Error finding job boosts", boostError);
      } else if (jobBoosts && jobBoosts.length > 0) {
        for (const boost of jobBoosts) {
          // Calculate expiry date based on duration
          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + boost.duration_hours);

          const { error: updateError } = await supabaseClient
            .from("job_boosts")
            .update({ 
              status: "active",
              activated_at: new Date().toISOString(),
              expires_at: expiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", boost.id);

          if (updateError) {
            logStep("Error updating job boost", updateError);
          } else {
            logStep("Job boost activated", { boostId: boost.id });

            // Create notification
            await supabaseClient
              .from("notifications")
              .insert({
                user_id: boost.user_id,
                title: "Impulsionamento Ativado",
                message: `Seu trabalho foi impulsionado com sucesso! Durará ${boost.duration_hours} horas.`,
                type: "boost_activated",
                data: { boostId: boost.id, paymentId }
              });

            logStep("Notification created for job boost");
          }
        }
      }

      // Check for premium subscriptions
      const { data: subscriptions, error: subError } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (subError) {
        logStep("Error finding subscriptions", subError);
      } else if (subscriptions && subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update({ 
              status: "active",
              activated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", subscription.id);

          if (updateError) {
            logStep("Error updating subscription", updateError);
          } else {
            logStep("Subscription activated", { subscriptionId: subscription.id });

            // Create notification
            await supabaseClient
              .from("notifications")
              .insert({
                user_id: subscription.user_id,
                title: "Assinatura Premium Ativada",
                message: "Sua assinatura premium foi ativada com sucesso!",
                type: "premium_activated",
                data: { subscriptionId: subscription.id, paymentId }
              });

            logStep("Notification created for premium subscription");
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook processing", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});