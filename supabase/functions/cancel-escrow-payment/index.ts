import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-ESCROW] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message}`);
    }

    const { escrow_id } = await req.json();
    if (!escrow_id) {
      throw new Error("escrow_id is required");
    }

    logStep("Processing escrow cancellation", { escrow_id });

    // Buscar o pagamento escrow
    const { data: escrowPayment, error: escrowError } = await supabaseClient
      .from('escrow_payments')
      .select('*')
      .eq('id', escrow_id)
      .single();

    if (escrowError || !escrowPayment) {
      throw new Error('Pagamento em escrow não encontrado');
    }

    logStep("Found escrow payment", { amount: escrowPayment.amount, status: escrowPayment.status });

    // Verificar se o usuário é o cliente deste pagamento
    if (escrowPayment.client_id !== userData.user.id) {
      throw new Error('Acesso negado: você não é o cliente deste pagamento');
    }

    // Verificar se o trabalho ainda existe
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('id, status')
      .eq('id', escrowPayment.job_id)
      .single();

    // Se o trabalho não existe ou está cancelado, podemos cancelar o escrow
    if (jobError || !job || job.status === 'cancelled') {
      logStep("Job not found or cancelled, proceeding with cancellation");

      // Se tem external_payment_id, tentar cancelar no AbacatePay
      if (escrowPayment.external_payment_id && escrowPayment.status !== 'cancelled') {
        try {
          logStep("Attempting to cancel payment with AbacatePay", { external_payment_id: escrowPayment.external_payment_id });
          
          const abacateResponse = await fetch('https://ws.abacatepay.com/v1/billing/billing-cancel', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('ABACATEPAY_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bill_id: escrowPayment.external_payment_id
            })
          });

          if (abacateResponse.ok) {
            logStep("Successfully cancelled payment with AbacatePay");
          } else {
            logStep("Failed to cancel with AbacatePay, but continuing with local cancellation");
          }
        } catch (error) {
          logStep("Error cancelling with AbacatePay", { error });
          // Continue mesmo se falhar, pois podemos marcar como cancelado localmente
        }
      }

      // Atualizar status do pagamento para cancelado
      const { error: updateError } = await supabaseClient
        .from('escrow_payments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrow_id);

      if (updateError) {
        throw new Error(`Erro ao cancelar pagamento: ${updateError.message}`);
      }

      logStep("Successfully cancelled escrow payment");

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Pagamento em escrow cancelado com sucesso' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else {
      // Trabalho ainda existe e não está cancelado
      throw new Error('Não é possível cancelar: o trabalho ainda está ativo');
    }

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