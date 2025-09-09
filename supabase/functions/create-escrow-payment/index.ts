import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ESCROW-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting escrow payment creation");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { jobId, providerId, amount, platformFee, paymentMethod = 'card' } = await req.json();
    if (!jobId || !providerId || !amount || !platformFee) {
      throw new Error("Missing required parameters");
    }

    const totalAmount = amount + platformFee;
    logStep("Payment parameters", { jobId, providerId, amount, platformFee, totalAmount, paymentMethod });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({ 
        email: user.email,
        name: user.user_metadata?.full_name || user.email 
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    const origin = req.headers.get("origin") || "https://yelytezcifyrykxvlbok.supabase.co";

    // Create Stripe checkout session instead of payment intent
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: paymentMethod === 'pix' ? ['boleto'] : ['card'], // Use boleto as PIX alternative
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Serviço Contratado',
            description: `Pagamento em escrow para job ${jobId}`
          },
          unit_amount: Math.round(totalAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&job_id=${jobId}`,
      cancel_url: `${origin}/checkout/cancel?job_id=${jobId}`,
      metadata: {
        jobId,
        providerId,
        clientId: user.id,
        type: "escrow_payment"
      },
      payment_intent_data: {
        metadata: {
          jobId,
          providerId,
          clientId: user.id,
          type: "escrow_payment"
        }
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Create escrow payment record
    const { data: escrowPayment, error: escrowError } = await supabaseClient
      .from("escrow_payments")
      .insert({
        client_id: user.id,
        provider_id: providerId,
        job_id: jobId,
        amount: amount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        status: "pending",
        stripe_payment_intent_id: session.payment_intent as string,
        release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single();

    if (escrowError) {
      logStep("Escrow payment creation error", { error: escrowError });
      throw escrowError;
    }
    logStep("Escrow payment record created", { escrowPaymentId: escrowPayment.id });

    return new Response(JSON.stringify({
      sessionUrl: session.url,
      sessionId: session.id,
      escrowPaymentId: escrowPayment.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in escrow payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});