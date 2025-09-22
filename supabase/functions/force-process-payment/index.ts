import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[FORCE-PROCESS-PAYMENT] ${step}`, data || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Force processing payment');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { paymentId } = await req.json();
    
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    logStep('Processing payment ID', { paymentId });

    // Call the check-abacatepay-payment function directly (no auth header needed now)
    const checkResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-abacatepay-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      },
      body: JSON.stringify({ paymentId })
    });

    const checkResult = await checkResponse.json();
    
    if (!checkResponse.ok) {
      logStep('Error calling check function', checkResult);
      throw new Error(checkResult.error || 'Check function failed');
    }

    logStep('Check function result', checkResult);

    // Also manually update the specific payment if needed
    const { data: escrowPayments, error: escrowError } = await supabaseClient
      .from("escrow_payments")
      .select("*, jobs:job_id(*)")
      .eq("external_payment_id", paymentId)
      .eq("status", "pending");

    if (escrowError) {
      logStep('Error querying escrow payments', escrowError);
    } else if (escrowPayments && escrowPayments.length > 0) {
      logStep('Found pending escrow payments', { count: escrowPayments.length });
      
      for (const escrow of escrowPayments) {
        // Force update to held status
        const releaseDate = new Date();
        releaseDate.setDate(releaseDate.getDate() + 5);

        const { error: updateError } = await supabaseClient
          .from("escrow_payments")
          .update({ 
            status: "held",
            release_date: releaseDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", escrow.id);

        if (updateError) {
          logStep('Error updating escrow payment', updateError);
        } else {
          logStep('Escrow payment updated to held', { escrowId: escrow.id });

          // Update job and accept proposal
          if (escrow.job_id && escrow.provider_id) {
            // Accept proposal
            const { error: proposalError } = await supabaseClient
              .from("proposals")
              .update({
                status: "accepted",
                accepted_at: new Date().toISOString()
              })
              .eq("job_id", escrow.job_id)
              .eq("provider_id", escrow.provider_id)
              .eq("status", "sent");

            if (proposalError) {
              logStep('Error accepting proposal', proposalError);
            } else {
              logStep('Proposal accepted');
            }

            // Update job
            const { error: jobError } = await supabaseClient
              .from("jobs")
              .update({ 
                status: "in_progress",
                provider_id: escrow.provider_id,
                final_price: escrow.amount,
                updated_at: new Date().toISOString()
              })
              .eq("id", escrow.job_id);

            if (jobError) {
              logStep('Error updating job', jobError);
            } else {
              logStep('Job updated to in_progress');

              // Create contract - first get the accepted proposal
              const { data: acceptedProposal } = await supabaseClient
                .from("proposals")
                .select("id")
                .eq("job_id", escrow.job_id)
                .eq("provider_id", escrow.provider_id)
                .eq("status", "accepted")
                .single();

              if (acceptedProposal) {
                const contractTerms = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO: ${escrow.jobs?.title || 'Serviço contratado'}

2. DESCRIÇÃO: ${escrow.jobs?.description || 'Serviço a ser executado conforme acordado'}

3. VALOR: R$ ${escrow.amount.toFixed(2).replace('.', ',')}

4. RESPONSABILIDADES:
   - O CONTRATANTE se compromete a fornecer todas as informações necessárias
   - O PRESTADOR se compromete a executar o serviço conforme especificado

5. PAGAMENTO: O pagamento foi efetuado e está protegido em garantia, sendo liberado automaticamente após 5 dias da conclusão ou mediante aprovação manual do cliente.

6. Este contrato é regido pelos Termos de Uso da plataforma Job Fast.

Contrato gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`;

                const { error: contractError } = await supabaseClient
                  .from("contracts")
                  .insert({
                    job_id: escrow.job_id,
                    client_id: escrow.client_id,
                    provider_id: escrow.provider_id,
                    proposal_id: acceptedProposal.id,
                    agreed_price: escrow.amount,
                    terms_and_conditions: contractTerms,
                    escrow_amount: escrow.amount,
                    status: "active",
                    client_signed: true,
                    provider_signed: true,
                    client_signed_at: new Date().toISOString(),
                    provider_signed_at: new Date().toISOString()
                  });

                if (contractError) {
                  logStep('Error creating contract', contractError);
                } else {
                  logStep('Contract created successfully');
                }
              } else {
                logStep('No accepted proposal found for contract creation');
              }
            }

            // Create notifications
            await supabaseClient
              .from("notifications")
              .insert([
                {
                  user_id: escrow.provider_id,
                  title: "Pagamento Confirmado - Trabalho Iniciado",
                  message: "O pagamento foi confirmado e o trabalho foi iniciado. Você pode começar a executar o serviço.",
                  type: "payment_confirmed",
                  data: { escrowId: escrow.id, paymentId }
                },
                {
                  user_id: escrow.client_id,
                  title: "Pagamento Confirmado - Trabalho Iniciado",
                  message: "Seu pagamento foi confirmado e o trabalho foi iniciado. Acompanhe o progresso.",
                  type: "payment_confirmed",
                  data: { escrowId: escrow.id, paymentId }
                }
              ]);

            logStep('Notifications created');
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Payment processed successfully",
      checkResult,
      processed: escrowPayments?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep('Error in force processing', { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});