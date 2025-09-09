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
    console.log("[PREMIUM-STATUS] Checking premium status");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // Create Supabase client with service role for DB updates
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user?.email) {
      throw new Error("User authentication failed");
    }

    const user = userData.user;
    console.log("[PREMIUM-STATUS] Checking status for user:", user.email);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find customer in Stripe
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    if (customers.data.length === 0) {
      console.log("[PREMIUM-STATUS] No customer found, user is not premium");
      
      // Update database to reflect non-premium status
      await supabaseService.from("subscriptions").upsert({
        user_id: user.id,
        provider: 'stripe',
        plan_name: 'Free',
        plan_price: 0,
        status: 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({
        is_premium: false,
        plan: 'free',
        status: 'inactive'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log("[PREMIUM-STATUS] Customer found:", customerId);

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10
    });

    const hasActiveSubscription = subscriptions.data.length > 0;
    let subscriptionData = null;

    if (hasActiveSubscription) {
      const subscription = subscriptions.data[0];
      subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        plan_amount: subscription.items.data[0].price.unit_amount / 100,
        cancel_at_period_end: subscription.cancel_at_period_end
      };

      console.log("[PREMIUM-STATUS] Active subscription found:", subscription.id);

      // Update database with current subscription status
      await supabaseService.from("subscriptions").upsert({
        user_id: user.id,
        external_subscription_id: subscription.id,
        provider: 'stripe',
        plan_name: 'Premium',
        plan_price: subscriptionData.plan_amount,
        status: 'active',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    } else {
      console.log("[PREMIUM-STATUS] No active subscription found");
      
      // Update database to reflect non-premium status
      await supabaseService.from("subscriptions").upsert({
        user_id: user.id,
        provider: 'stripe',
        plan_name: 'Free',
        plan_price: 0,
        status: 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }

    return new Response(JSON.stringify({
      is_premium: hasActiveSubscription,
      plan: hasActiveSubscription ? 'premium' : 'free',
      status: hasActiveSubscription ? 'active' : 'inactive',
      subscription: subscriptionData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[PREMIUM-STATUS] Error checking premium status:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      is_premium: false,
      plan: 'free',
      status: 'error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});