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
    const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/${paymentId}`, {
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

      // Verificar se há escrow payments pendentes com este payment ID
      const { data: escrowPayments, error: escrowError } = await serviceRoleClient
        .from("escrow_payments")
        .select("*, jobs:job_id(id, client_id)")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (!escrowError && escrowPayments && escrowPayments.length > 0) {
        for (const escrow of escrowPayments) {
          // Update escrow payment to "held" status
          const releaseDate = new Date();
          releaseDate.setDate(releaseDate.getDate() + 5); // 5 dias para liberação automática

          await serviceRoleClient
            .from("escrow_payments")
            .update({ 
              status: "held",
              release_date: releaseDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", escrow.id);

          // Update job status to in_progress if it has a job
          if (escrow.job_id) {
            await serviceRoleClient
              .from("jobs")
              .update({ 
                status: "in_progress",
                updated_at: new Date().toISOString()
              })
              .eq("id", escrow.job_id);
          }
        }
      }

      // Verificar job boosts
      const { data: jobBoosts, error: boostError } = await serviceRoleClient
        .from("job_boosts")
        .select("*")
        .eq("external_payment_id", paymentId)
        .eq("status", "pending");

      if (!boostError && jobBoosts && jobBoosts.length > 0) {
        for (const boost of jobBoosts) {
          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + boost.duration_hours);

          await serviceRoleClient
            .from("job_boosts")
            .update({ 
              status: "active",
              activated_at: new Date().toISOString(),
              expires_at: expiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", boost.id);
        }
      }

      logStep('Payment processed successfully');
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