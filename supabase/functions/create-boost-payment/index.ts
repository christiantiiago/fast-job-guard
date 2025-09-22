import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOST-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { jobId, boostType, amount, duration } = await req.json();
    if (!jobId || !boostType || !amount || !duration) {
      throw new Error("Missing required parameters: jobId, boostType, amount, duration");
    }
    logStep("Request parsed", { jobId, boostType, amount, duration });

    // Verificar se o job pertence ao usuário
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('id, title, client_id')
      .eq('id', jobId)
      .eq('client_id', user.id)
      .single();
    
    if (jobError || !job) {
      throw new Error("Job not found or not owned by user");
    }
    logStep("Job verified", { jobTitle: job.title });

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27",
    });

    // Verificar/criar cliente Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      logStep("New Stripe customer created", { customerId });
    }

    // Criar produto e preço dinamicamente para o boost
    const product = await stripe.products.create({
      name: `Job Boost - ${boostType}`,
      description: `Impulsionar trabalho "${job.title}" por ${duration}`,
      metadata: {
        boost_type: boostType,
        job_id: jobId,
        user_id: user.id
      }
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100), // Converter para centavos
      currency: 'brl',
    });

    logStep("Product and price created", { productId: product.id, priceId: price.id });

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/boost-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/jobs`,
      metadata: {
        boost_type: boostType,
        job_id: jobId,
        user_id: user.id,
        duration_hours: duration.toString()
      }
    });

    // Criar registro de boost na tabela
    const { error: boostError } = await supabaseClient
      .from('job_boosts')
      .insert({
        job_id: jobId,
        user_id: user.id,
        boost_type: boostType,
        amount: amount,
        duration_hours: duration,
        stripe_session_id: session.id,
        status: 'pending'
      });

    if (boostError) {
      logStep("Error creating boost record", { error: boostError });
      throw new Error(`Failed to create boost record: ${boostError.message}`);
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-boost-payment", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});