import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    try {
      // Verify webhook signature if endpoint secret is configured
      if (endpointSecret && signature) {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
        logStep("Webhook signature verified");
      } else {
        // For development - parse without verification
        event = JSON.parse(body);
        logStep("Webhook parsed (no signature verification)");
      }
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    logStep("Processing webhook event", { type: event.type, id: event.id });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });
        
        const { jobId, providerId, clientId } = session.metadata || {};
        
        if (!jobId || !providerId || !clientId) {
          logStep("Missing metadata in session", { metadata: session.metadata });
          break;
        }

        // Update escrow payment status
        const { error: updateError } = await supabaseClient
          .from("escrow_payments")
          .update({ 
            status: "held",
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString()
          })
          .eq("job_id", jobId)
          .eq("client_id", clientId)
          .eq("provider_id", providerId);

        if (updateError) {
          logStep("Error updating escrow payment", { error: updateError });
        } else {
          logStep("Escrow payment updated to held");
        }

        // Update job status to in_progress
        const { error: jobUpdateError } = await supabaseClient
          .from("jobs")
          .update({ 
            status: "in_progress",
            updated_at: new Date().toISOString()
          })
          .eq("id", jobId);

        if (jobUpdateError) {
          logStep("Error updating job status", { error: jobUpdateError });
        } else {
          logStep("Job status updated to in_progress");
        }

        // Create notification for provider
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: providerId,
            title: "Pagamento Recebido",
            message: "O pagamento foi confirmado e está em escrow. Você pode iniciar o trabalho.",
            type: "payment_confirmed",
            data: { jobId, sessionId: session.id }
          });

        // Create notification for client
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: clientId,
            title: "Pagamento Confirmado",
            message: "Seu pagamento foi confirmado e está protegido em escrow.",
            type: "payment_confirmed",
            data: { jobId, sessionId: session.id }
          });

        logStep("Notifications created");
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
        
        // Additional handling if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent failed", { paymentIntentId: paymentIntent.id });
        
        const { jobId, providerId, clientId } = paymentIntent.metadata || {};
        
        if (jobId && clientId) {
          // Update escrow payment status to failed
          await supabaseClient
            .from("escrow_payments")
            .update({ 
              status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_payment_intent_id", paymentIntent.id);

          // Create notification
          await supabaseClient
            .from("notifications")
            .insert({
              user_id: clientId,
              title: "Falha no Pagamento",
              message: "Houve um problema com o seu pagamento. Tente novamente.",
              type: "payment_failed",
              data: { jobId, paymentIntentId: paymentIntent.id }
            });

          logStep("Payment failure handled");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
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