import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[PREMIUM] Starting premium payment creation");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      throw new Error("User authentication failed");
    }

    const user = userData.user;
    console.log("[PREMIUM] User authenticated:", user.email);

    const { paymentMethod } = await req.json();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[PREMIUM] Existing customer found:", customerId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          source: 'job_fast_premium'
        }
      });
      customerId = customer.id;
      console.log("[PREMIUM] New customer created:", customerId);
    }

    const origin = req.headers.get("origin") || "https://id-preview--3a9424a9-9f63-406b-baf3-0311e8e4ac7b.lovable.app";

    // Create subscription checkout session
    const sessionData = {
      customer: customerId,
      payment_method_types: paymentMethod === 'pix' ? ['pix'] : ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Job Fast Premium',
              description: 'Acesso premium com taxas reduzidas, metas personalizadas e recursos exclusivos',
            },
            unit_amount: 6990, // R$ 69,90 em centavos
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?cancelled=true`,
      metadata: {
        user_id: user.id,
        type: 'premium_subscription'
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: 'premium'
        }
      }
    };

    // PIX specific configuration
    if (paymentMethod === 'pix') {
      sessionData.payment_method_options = {
        pix: {
          expires_after_seconds: 86400, // 24 horas para pagar
        }
      };
      console.log("[PREMIUM] PIX payment configured - 24h expiry");
    }

    const session = await stripe.checkout.sessions.create(sessionData);
    
    console.log("[PREMIUM] Checkout session created:", session.id);
    console.log("[PREMIUM] Payment method:", paymentMethod);
    console.log("[PREMIUM] Session URL generated successfully");

    // Store subscription attempt in database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("subscriptions").upsert({
      user_id: user.id,
      external_subscription_id: session.subscription || session.id,
      provider: 'stripe',
      plan_name: 'Premium',
      plan_price: 69.90,
      status: 'incomplete',
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      payment_method: paymentMethod
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[PREMIUM] Error creating payment:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create premium payment session"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});