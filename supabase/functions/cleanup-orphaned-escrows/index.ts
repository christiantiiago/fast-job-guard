import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-ESCROWS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar pagamentos escrow órfãos (sem trabalho correspondente ou com trabalho cancelado)
    const { data: orphanedEscrows, error: escrowError } = await supabaseClient
      .from('escrow_payments')
      .select(`
        *,
        jobs!left(id, status)
      `)
      .in('status', ['pending', 'held']);

    if (escrowError) {
      throw new Error(`Erro ao buscar pagamentos: ${escrowError.message}`);
    }

    logStep("Found escrow payments", { count: orphanedEscrows?.length || 0 });

    let cancelledCount = 0;
    let processedPayments = [];

    for (const escrow of orphanedEscrows || []) {
      // Se o trabalho não existe ou está cancelado
      if (!escrow.jobs || escrow.jobs.length === 0 || escrow.jobs[0]?.status === 'cancelled') {
        logStep("Processing orphaned escrow", { 
          escrow_id: escrow.id, 
          job_exists: !!escrow.jobs && escrow.jobs.length > 0,
          job_status: escrow.jobs?.[0]?.status 
        });

        // Tentar cancelar no AbacatePay se necessário
        if (escrow.external_payment_id) {
          try {
            const abacateResponse = await fetch('https://ws.abacatepay.com/v1/billing/billing-cancel', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('ABACATEPAY_API_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bill_id: escrow.external_payment_id
              })
            });

            if (abacateResponse.ok) {
              logStep("Successfully cancelled payment with AbacatePay", { external_payment_id: escrow.external_payment_id });
            }
          } catch (error) {
            logStep("Error cancelling with AbacatePay", { error, external_payment_id: escrow.external_payment_id });
          }
        }

        // Atualizar status local para cancelado
        const { error: updateError } = await supabaseClient
          .from('escrow_payments')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrow.id);

        if (!updateError) {
          cancelledCount++;
          processedPayments.push({
            id: escrow.id,
            amount: escrow.amount,
            job_id: escrow.job_id
          });
          logStep("Successfully cancelled orphaned escrow", { escrow_id: escrow.id });
        } else {
          logStep("Failed to cancel escrow", { escrow_id: escrow.id, error: updateError });
        }
      }
    }

    logStep("Cleanup completed", { 
      total_found: orphanedEscrows?.length || 0,
      cancelled_count: cancelledCount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processamento concluído: ${cancelledCount} pagamentos cancelados`,
      cancelled_count: cancelledCount,
      processed_payments: processedPayments
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});