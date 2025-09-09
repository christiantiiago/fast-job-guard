import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DIRECT-PROPOSAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting direct proposal creation");

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

    const { 
      providerId, 
      title, 
      description, 
      proposedPrice, 
      estimatedHours, 
      deadline, 
      clientMessage 
    } = await req.json();

    if (!providerId || !title || !description || !proposedPrice) {
      throw new Error("Missing required parameters");
    }

    logStep("Proposal parameters", { providerId, title, proposedPrice, estimatedHours });

    // Create direct proposal
    const { data: proposal, error: proposalError } = await supabaseClient
      .from("direct_proposals")
      .insert({
        client_id: user.id,
        provider_id: providerId,
        title,
        description,
        proposed_price: proposedPrice,
        estimated_hours: estimatedHours,
        deadline: deadline ? new Date(deadline).toISOString().split('T')[0] : null,
        client_message: clientMessage,
        status: "pending"
      })
      .select()
      .single();

    if (proposalError) throw proposalError;
    logStep("Direct proposal created", { proposalId: proposal.id });

    // Create notification for provider
    const { error: notificationError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: providerId,
        type: "direct_proposal",
        title: "Nova Proposta Direta",
        message: `Você recebeu uma proposta direta para: ${title}`,
        data: {
          proposalId: proposal.id,
          clientId: user.id,
          proposedPrice: proposedPrice
        }
      });

    if (notificationError) {
      console.warn("Failed to create notification:", notificationError);
    }

    return new Response(JSON.stringify({
      success: true,
      proposal
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in direct proposal creation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});