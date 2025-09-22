import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[ABACATEPAY-PAYMENT] ${step}`, data || '');
};

serve(async (req) => {
  logStep('Request received', { method: req.method });
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      logStep('User not authenticated');
      throw new Error("Usuário não autenticado");
    }

    logStep('User authenticated', { userId: user.id });

    const { amount, description, paymentType, customer, paymentData } = await req.json();
    
    logStep('Request data parsed', { amount, description, paymentType });

    // Chave da API AbacatePay (deve ser configurada nas secrets)
    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    // Preparar dados para a API da AbacatePay (endpoint pixQrCode/create)
    const paymentRequest = {
      amount: Math.round(amount * 100), // AbacatePay trabalha com centavos
      expiresIn: 900, // 15 minutos em segundos
      description: description,
      customer: {
        name: customer.name,
        cellphone: customer.phone.replace(/\D/g, ''),
        email: customer.email,
        taxId: customer.cpf.replace(/\D/g, '')
      },
      metadata: {
        externalId: `${user.id}_${paymentType}_${Date.now()}`,
        user_id: user.id,
        payment_type: paymentType,
        ...paymentData
      }
    };

    logStep('Sending request to AbacatePay', { paymentRequest });

    // Fazer requisição para a API da AbacatePay usando o endpoint correto
    const abacateResponse = await fetch("https://api.abacatepay.com/v1/pixQrCode/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${abacatePayApiKey}`,
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!abacateResponse.ok) {      
      const errorText = await abacateResponse.text();
      logStep('AbacatePay API error', { status: abacateResponse.status, error: errorText });
      throw new Error(`Erro na API AbacatePay: ${abacateResponse.status} - ${errorText}`);
    }

    const abacateData = await abacateResponse.json();
    logStep('AbacatePay response received', { paymentId: abacateData.id });

    // Salvar o pagamento no banco de dados baseado no tipo
    let recordId;
    
    switch (paymentType) {
      case 'premium':
        const { data: subscriptionData, error: subscriptionError } = await supabaseClient
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan: 'premium',
            status: 'pending',
            external_payment_id: abacateData.id,
            amount: amount,
            payment_method: 'pix'
          })
          .select()
          .single();
        
        if (subscriptionError) throw subscriptionError;
        recordId = subscriptionData.id;
        break;

      case 'boost':
        const { data: boostData, error: boostError } = await supabaseClient
          .from('job_boosts')
          .insert({
            job_id: paymentData.jobId,
            user_id: user.id,
            boost_type: paymentData.boostType,
            amount: amount,
            duration_hours: paymentData.duration,
            status: 'pending',
            external_payment_id: abacateData.id
          })
          .select()
          .single();
        
        if (boostError) throw boostError;
        recordId = boostData.id;
        break;

      case 'job':
        const { data: escrowData, error: escrowError } = await supabaseClient
          .from('escrow_payments')
          .insert({
            job_id: paymentData.jobId,
            client_id: user.id,
            provider_id: paymentData.providerId,
            amount: paymentData.serviceAmount,
            platform_fee: paymentData.platformFee,
            total_amount: amount,
            status: 'pending',
            external_payment_id: abacateData.id
          })
          .select()
          .single();
        
        if (escrowError) throw escrowError;
        recordId = escrowData.id;
        break;

      case 'direct_proposal':
        const { data: directData, error: directError } = await supabaseClient
          .from('escrow_payments')
          .insert({
            client_id: user.id,
            provider_id: paymentData.providerId,
            amount: paymentData.serviceAmount,
            platform_fee: paymentData.platformFee,
            total_amount: amount,
            status: 'pending',
            external_payment_id: abacateData.id
          })
          .select()
          .single();
        
        if (directError) throw directError;
        recordId = directData.id;
        break;
    }

    logStep('Payment record created', { recordId, paymentType });

    return new Response(JSON.stringify({
      success: true,
      qrCode: abacateData.qrCode || abacateData.qr_code || abacateData.qr_code_url,
      paymentId: abacateData.id || abacateData.transactionId,
      recordId: recordId,
      expiresAt: abacateData.expiresAt || abacateData.expires_at
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