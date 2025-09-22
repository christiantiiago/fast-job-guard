import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RELEASE-ESCROW-JOB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting auto-release process");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find escrow payments that need to be auto-released (5 days after job marked as waiting_approval)
    const { data: escrowPayments, error: escrowError } = await supabaseClient
      .from("escrow_payments")
      .select(`
        *,
        jobs:job_id(id, title, status, client_id, provider_id)
      `)
      .eq("status", "held")
      .lte("release_date", new Date().toISOString());

    if (escrowError) {
      throw new Error(`Error fetching escrow payments: ${escrowError.message}`);
    }

    logStep("Found escrow payments to process", { count: escrowPayments?.length || 0 });

    let processedCount = 0;

    if (escrowPayments && escrowPayments.length > 0) {
      for (const escrow of escrowPayments) {
        try {
          logStep("Processing escrow payment", { 
            escrowId: escrow.id, 
            jobId: escrow.job_id,
            jobStatus: escrow.jobs?.status 
          });

          // Only auto-release if job is in waiting_approval status
          if (escrow.jobs?.status === 'waiting_approval') {
            // Call the release-escrow-payment function for auto-release
            const releaseResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/release-escrow-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                escrowPaymentId: escrow.id,
                releaseType: 'auto'
              })
            });

            if (releaseResponse.ok) {
              processedCount++;
              logStep("Successfully auto-released escrow", { escrowId: escrow.id });

              // Update job status to completed after auto-release
              await supabaseClient
                .from("jobs")
                .update({ 
                  status: "completed",
                  updated_at: new Date().toISOString()
                })
                .eq("id", escrow.job_id);

              logStep("Job marked as completed", { jobId: escrow.job_id });
            } else {
              const errorText = await releaseResponse.text();
              logStep("Failed to auto-release escrow", { 
                escrowId: escrow.id, 
                error: errorText 
              });
            }
          } else {
            logStep("Skipping escrow - job not in waiting_approval status", {
              escrowId: escrow.id,
              jobStatus: escrow.jobs?.status
            });
          }
        } catch (error) {
          logStep("Error processing individual escrow", { 
            escrowId: escrow.id, 
            error: error.message 
          });
        }
      }
    }

    logStep("Auto-release process completed", { processed: processedCount });

    return new Response(JSON.stringify({
      message: "Auto-release process completed",
      processed: processedCount,
      total: escrowPayments?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in auto-release process", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});