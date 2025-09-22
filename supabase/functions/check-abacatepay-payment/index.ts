import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[CHECK-ABACATEPAY-PAYMENT] ${step}`, data || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Request received');
    
    // Criar cliente Supabase para autenticação
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verificar autenticação do usuário
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const { paymentId } = await req.json();
    
    if (!paymentId) {
      throw new Error("Payment ID é obrigatório");
    }

    logStep('Checking payment status', { paymentId });

    // Chave da API AbacatePay
    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    // Fazer requisição para a API da AbacatePay para verificar status
    const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${abacatePayApiKey}`,
      }
    });

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      logStep('AbacatePay API error', { status: abacateResponse.status, error: errorText });
      throw new Error(`Erro na API AbacatePay: ${abacateResponse.status} - ${errorText}`);
    }

    const abacateData = await abacateResponse.json();
    logStep('AbacatePay response received', abacateData);

    const isPaid = abacateData.data?.status === "CONFIRMED" || abacateData.data?.status === "PAID";
    
    // Se o pagamento foi confirmado, processar automaticamente
    if (isPaid) {
      const serviceRoleClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      logStep('Payment confirmed, processing full workflow', { paymentId });

      // Find records with this external payment ID
      const { data: escrowPayments, error: escrowError } = await serviceRoleClient
        .from("escrow_payments")
        .select("*, jobs:job_id(id, client_id, provider_id, status)")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (escrowError) {
        logStep("Error finding escrow payments", escrowError);
      } else if (escrowPayments && escrowPayments.length > 0) {
        logStep("Found escrow payments to process", { count: escrowPayments.length });
        
        for (const escrow of escrowPayments) {
          logStep("Processing escrow payment", { escrowId: escrow.id, jobId: escrow.job_id });
          
          // Update escrow payment to "held" status
          const releaseDate = new Date();
          releaseDate.setDate(releaseDate.getDate() + 5); // 5 dias para liberação automática

          const { error: updateError } = await serviceRoleClient
            .from("escrow_payments")
            .update({ 
              status: "held",
              release_date: releaseDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", escrow.id);

          if (updateError) {
            logStep("Error updating escrow payment", updateError);
            continue;
          }
          
          logStep("Escrow payment updated to held", { escrowId: escrow.id });

          // Find and accept the proposal automatically
          if (escrow.job_id && escrow.provider_id) {
            logStep("Finding proposal to auto-accept", { jobId: escrow.job_id, providerId: escrow.provider_id });
            
            // Find the proposal for this provider and job
            const { data: proposals, error: proposalError } = await serviceRoleClient
              .from("proposals")
              .select("id, status")
              .eq("job_id", escrow.job_id)
              .eq("provider_id", escrow.provider_id)
              .eq("status", "sent")
              .limit(1);

            if (proposalError) {
              logStep("Error finding proposal", proposalError);
            } else if (proposals && proposals.length > 0) {
              const proposal = proposals[0];
              logStep("Auto-accepting proposal", { proposalId: proposal.id });

              // Accept the proposal
              const { error: acceptError } = await serviceRoleClient
                .from("proposals")
                .update({
                  status: "accepted",
                  accepted_at: new Date().toISOString()
                })
                .eq("id", proposal.id);

              if (acceptError) {
                logStep("Error accepting proposal", acceptError);
              } else {
                logStep("Proposal accepted successfully", { proposalId: proposal.id });
              }
            }

            // Update job status to in_progress and assign provider
            const { error: jobUpdateError } = await serviceRoleClient
              .from("jobs")
              .update({ 
                status: "in_progress",
                provider_id: escrow.provider_id,
                final_price: escrow.amount,
                updated_at: new Date().toISOString()
              })
              .eq("id", escrow.job_id);

            if (jobUpdateError) {
              logStep("Error updating job status", jobUpdateError);
            } else {
              logStep("Job status updated to in_progress", { 
                jobId: escrow.job_id, 
                providerId: escrow.provider_id,
                finalPrice: escrow.amount 
              });

              // Generate contract automatically
              const { data: jobData } = await serviceRoleClient
                .from("jobs")
                .select("title, description, client_id")
                .eq("id", escrow.job_id)
                .single();

              if (jobData) {
                const contractTerms = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO: ${jobData.title}

2. DESCRIÇÃO: ${jobData.description}

3. VALOR: R$ ${escrow.amount.toFixed(2).replace('.', ',')}

4. RESPONSABILIDADES:
   - O CONTRATANTE se compromete a fornecer todas as informações necessárias
   - O PRESTADOR se compromete a executar o serviço conforme especificado

5. PAGAMENTO: O pagamento foi efetuado e está protegido em garantia, sendo liberado automaticamente após 5 dias da conclusão ou mediante aprovação manual do cliente.

6. Este contrato é regido pelos Termos de Uso da plataforma Job Fast.

Contrato gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`;

                const { error: contractError } = await serviceRoleClient
                  .from("contracts")
                  .insert({
                    job_id: escrow.job_id,
                    client_id: jobData.client_id,
                    provider_id: escrow.provider_id,
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
                  logStep("Error creating contract", contractError);
                } else {
                  logStep("Contract created successfully");
                }
              }
            }
          }

          // Create notifications
          await serviceRoleClient
            .from("notifications")
            .insert([
              {
                user_id: escrow.provider_id,
                title: "Pagamento Confirmado",
                message: "O pagamento foi confirmado e está em garantia. Você pode iniciar o trabalho.",
                type: "payment_confirmed",
                data: { escrowId: escrow.id, paymentId }
              },
              {
                user_id: escrow.client_id,
                title: "Pagamento Confirmado",
                message: "Seu pagamento foi confirmado e está protegido em garantia.",
                type: "payment_confirmed",
                data: { escrowId: escrow.id, paymentId }
              }
            ]);

          logStep("Notifications created for escrow payment");
        }
      }

      // Check for job boosts
      const { data: jobBoosts, error: boostError } = await serviceRoleClient
        .from("job_boosts")
        .select("*")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (boostError) {
        logStep("Error finding job boosts", boostError);
      } else if (jobBoosts && jobBoosts.length > 0) {
        for (const boost of jobBoosts) {
          // Calculate expiry date based on duration
          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + boost.duration_hours);

          const { error: updateError } = await serviceRoleClient
            .from("job_boosts")
            .update({ 
              status: "active",
              activated_at: new Date().toISOString(),
              expires_at: expiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", boost.id);

          if (updateError) {
            logStep("Error updating job boost", updateError);
          } else {
            logStep("Job boost activated", { boostId: boost.id });

            // Create notification
            await serviceRoleClient
              .from("notifications")
              .insert({
                user_id: boost.user_id,
                title: "Impulsionamento Ativado",
                message: `Seu trabalho foi impulsionado com sucesso! Durará ${boost.duration_hours} horas.`,
                type: "boost_activated",
                data: { boostId: boost.id, paymentId }
              });

            logStep("Notification created for job boost");
          }
        }
      }

      // Check for premium subscriptions
      const { data: subscriptions, error: subError } = await serviceRoleClient
        .from("subscriptions")
        .select("*")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (subError) {
        logStep("Error finding subscriptions", subError);
      } else if (subscriptions && subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          const { error: updateError } = await serviceRoleClient
            .from("subscriptions")
            .update({ 
              status: "active",
              activated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", subscription.id);

          if (updateError) {
            logStep("Error updating subscription", updateError);
          } else {
            logStep("Subscription activated", { subscriptionId: subscription.id });

            // Create notification
            await serviceRoleClient
              .from("notifications")
              .insert({
                user_id: subscription.user_id,
                title: "Assinatura Premium Ativada",
                message: "Sua assinatura premium foi ativada com sucesso!",
                type: "premium_activated",
                data: { subscriptionId: subscription.id, paymentId }
              });

            logStep("Notification created for premium subscription");
          }
        }
      }

      logStep('Payment processed successfully - Complete workflow finished');
    }

    return new Response(JSON.stringify({
      success: true,
      isPaid,
      status: abacateData.data?.status,
      expiresAt: abacateData.data?.expiresAt
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep('Error occurred', { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});