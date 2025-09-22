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
      // Log detalhado do início
      logStep('Starting payment processing');
      
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

      // Criar cliente Supabase com service role para operações de banco
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const requestBody = await req.json();
      logStep('Raw request body', requestBody);
      
      const { amount, description, paymentType, customer, paymentData } = requestBody;
      
      logStep('Request data parsed', { amount, description, paymentType, customer, paymentData });

    // Chave da API AbacatePay (deve ser configurada nas secrets)
    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    // Verificar se todos os campos obrigatórios estão presentes
    if (!customer.name || !customer.phone || !customer.email || !customer.cpf) {
      logStep('Missing required customer fields', { customer });
      throw new Error("Todos os campos do cliente são obrigatórios: nome, telefone, email e CPF");
    }

    // Preparar dados para a API da AbacatePay (endpoint pixQrCode/create)
    const paymentRequest = {
      amount: Math.round(amount * 100), // AbacatePay trabalha com centavos
      expiresIn: 1800, // 30 minutos em segundos (aumentado de 15 para 30 min)
      description: description,
      customer: {
        name: customer.name,
        cellphone: customer.phone.replace(/\D/g, ''),
        email: customer.email,
        taxId: customer.cpf.replace(/\D/g, '')
      },
      metadata: {
        externalId: `${user.id}_${paymentType}_${Date.now()}`,
        paymentType: paymentType,
        userId: user.id
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
    logStep('AbacatePay response received', { 
      success: !!abacateData.data,
      paymentId: abacateData.data?.id,
      status: abacateData.data?.status,
      error: abacateData.error,
      hasData: !!abacateData.data,
      hasBrCode: !!abacateData.data?.brCode,
      hasBrCodeBase64: !!abacateData.data?.brCodeBase64,
      brCodeLength: abacateData.data?.brCode?.length,
      expiresAt: abacateData.data?.expiresAt,
      fullData: abacateData.data // Log completo para debug
    });

    // Verificar se houve erro na resposta da AbacatePay
    if (abacateData.error || !abacateData.data || !abacateData.data.id) {
      logStep('AbacatePay API error in response', { 
        error: abacateData.error,
        hasData: !!abacateData.data,
        hasId: !!abacateData.data?.id,
        hasBrCode: !!abacateData.data?.brCode,
        hasBrCodeBase64: !!abacateData.data?.brCodeBase64,
        fullResponse: abacateData 
      });
      throw new Error(`Erro na API AbacatePay: ${abacateData.error || 'Resposta inválida - faltam dados essenciais'}`);
    }

    // Salvar o pagamento no banco de dados baseado no tipo
    let recordId;
    
    switch (paymentType) {
      case 'premium':
        const { data: subscriptionData, error: subscriptionError } = await supabaseService
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan: 'premium',
            status: 'pending',
            external_payment_id: abacateData.data.id,
            amount: amount,
            payment_method: 'pix'
          })
          .select()
          .single();
        
        if (subscriptionError) throw subscriptionError;
        recordId = subscriptionData.id;
        break;

      case 'boost':
        logStep('Creating job boost record', { 
          jobId: paymentData.jobId, 
          userId: user.id, 
          boostType: paymentData.boostType 
        });
        
        const { data: boostData, error: boostError } = await supabaseService
          .from('job_boosts')
          .insert({
            job_id: paymentData.jobId,
            user_id: user.id,
            boost_type: paymentData.boostType,
            amount: amount,
            duration_hours: paymentData.duration,
            status: 'pending',
            external_payment_id: abacateData.data.id
          })
          .select()
          .single();
        
        if (boostError) {
          logStep('Job boost creation failed', { error: boostError });
          throw boostError;
        }
        
        logStep('Job boost created successfully', { recordId: boostData.id });
        recordId = boostData.id;
        break;

      case 'job':
        const { data: escrowData, error: escrowError } = await supabaseService
          .from('escrow_payments')
          .insert({
            job_id: paymentData.jobId,
            client_id: user.id,
            provider_id: paymentData.providerId,
            amount: paymentData.serviceAmount,
            platform_fee: paymentData.platformFee,
            total_amount: amount,
            status: 'pending',
            external_payment_id: abacateData.data.id
          })
          .select()
          .single();
        
        if (escrowError) throw escrowError;
        recordId = escrowData.id;
        break;

      case 'direct_proposal':
        const { data: directData, error: directError } = await supabaseService
          .from('escrow_payments')
          .insert({
            client_id: user.id,
            provider_id: paymentData.providerId,
            amount: paymentData.serviceAmount,
            platform_fee: paymentData.platformFee,
            total_amount: amount,
            status: 'pending',
            external_payment_id: abacateData.data.id
          })
          .select()
          .single();
        
        if (directError) throw directError;
        recordId = directData.id;
        break;
    }

    logStep('Payment record created', { recordId, paymentType });

    // Melhorar o retorno da resposta
    const responseData = {
      success: true,
      qrCodeBase64: abacateData.data.brCodeBase64, // Imagem do QR Code em base64
      pixCopyPasteCode: abacateData.data.brCode, // Código PIX copia e cola
      brCode: abacateData.data.brCode, // Código PIX copia e cola (compatibilidade)
      paymentId: abacateData.data.id,
      recordId: recordId,
      expiresAt: abacateData.data.expiresAt,
      // Debug info
      debugInfo: {
        brCodeLength: abacateData.data.brCode?.length,
        hasValidBrCode: !!abacateData.data.brCode,
        apiEnvironment: abacateData.data.environment || 'unknown'
      }
    };

    logStep('Returning success response', responseData);

    return new Response(JSON.stringify(responseData), {
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