import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RELEASE-ESCROW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting escrow release");

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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { escrowPaymentId, releaseType = 'manual' } = await req.json();
    if (!escrowPaymentId) {
      throw new Error("Missing escrowPaymentId");
    }

    logStep("Release parameters", { escrowPaymentId, releaseType });

    // Get escrow payment details
    const { data: escrowPayment, error: escrowError } = await supabaseClient
      .from("escrow_payments")
      .select(`
        *,
        jobs:job_id(client_id, title, status)
      `)
      .eq("id", escrowPaymentId)
      .single();

    if (escrowError || !escrowPayment) {
      throw new Error("Escrow payment not found");
    }

    logStep("Escrow payment found", { 
      status: escrowPayment.status, 
      amount: escrowPayment.amount,
      clientId: escrowPayment.jobs?.client_id 
    });

    // Verify authorization (only client can release manually, or system for auto-release)
    if (releaseType === 'manual' && escrowPayment.jobs?.client_id !== user.id) {
      throw new Error("Only the client can release escrow payment");
    }

    // Check if already released
    if (escrowPayment.status === 'released') {
      return new Response(JSON.stringify({ 
        message: "Escrow payment already released",
        status: "released" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if payment is in held status
    if (escrowPayment.status !== 'held') {
      throw new Error(`Cannot release payment with status: ${escrowPayment.status}`);
    }

    // For auto-release, check if release date has passed
    if (releaseType === 'auto') {
      const releaseDate = new Date(escrowPayment.release_date);
      const now = new Date();
      if (now < releaseDate) {
        throw new Error("Auto-release date has not been reached yet");
      }
    }

    // Calculate amounts for transfer (without Stripe)
    const providerAmount = escrowPayment.amount; // Provider gets the service amount
    const platformFee = escrowPayment.platform_fee; // Platform keeps the fee

    logStep("Amount calculation", { 
      providerAmount, 
      platformFee, 
      totalAmount: escrowPayment.total_amount 
    });

    // Update escrow payment status to released
    const { error: updateError } = await supabaseClient
      .from("escrow_payments")
      .update({ 
        status: "released",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", escrowPaymentId);

    if (updateError) {
      throw updateError;
    }

    logStep("Escrow payment status updated to released");

    // Update job status to completed if released manually by client
    if (releaseType === 'manual') {
      const { error: jobUpdateError } = await supabaseClient
        .from("jobs")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", escrowPayment.job_id);

      if (jobUpdateError) {
        logStep("Error updating job status", { error: jobUpdateError });
      } else {
        logStep("Job status updated to completed");
      }
    }

    // Create notifications
    await supabaseClient
      .from("notifications")
      .insert([
        {
          user_id: escrowPayment.provider_id,
          title: "Pagamento Liberado",
          message: `O pagamento de R$ ${providerAmount.toFixed(2)} foi liberado e será transferido para sua conta.`,
          type: "payment_released",
          data: { 
            escrowPaymentId, 
            amount: providerAmount,
            releaseType,
            jobId: escrowPayment.job_id 
          }
        },
        {
          user_id: escrowPayment.client_id,
          title: releaseType === 'manual' ? "Pagamento Liberado" : "Pagamento Liberado Automaticamente",
          message: releaseType === 'manual' 
            ? "Você liberou o pagamento para o prestador de serviços."
            : "O pagamento foi liberado automaticamente após o prazo de 5 dias.",
          type: "payment_released",
          data: { 
            escrowPaymentId, 
            amount: providerAmount,
            releaseType,
            jobId: escrowPayment.job_id 
          }
        }
      ]);

    logStep("Notifications created");

    // Here you would integrate with your payment processor to transfer money to provider
    // For now, we just log the transfer simulation
    logStep("Payment transfer simulated", { 
      providerId: escrowPayment.provider_id,
      amount: providerAmount,
      platformFee
    });

    return new Response(JSON.stringify({
      message: "Escrow payment released successfully",
      status: "released",
      providerAmount,
      platformFee,
      releaseType
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in escrow release", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});