import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentAnalysisRequest {
  documentId: string;
  documentType: string;
  imageUrl: string;
}

interface AIAnalysisResult {
  documentType: string;
  isValid: boolean;
  confidence: number;
  fraudIndicators: string[];
  qualityIssues: string[];
  recommendations: string;
  detectedInfo: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, documentType, imageUrl }: DocumentAnalysisRequest = await req.json();

    console.log(`Analisando documento ${documentId} do tipo ${documentType}`);

    // Prompt específico para cada tipo de documento
    const documentPrompts = {
      rg: "Analise este documento de RG brasileiro. Verifique: 1) Se é um RG válido 2) Qualidade da imagem 3) Se há sinais de falsificação 4) Se o documento está legível. Extraia: nome completo, número do RG, data de nascimento, órgão emissor.",
      cpf: "Analise este documento de CPF brasileiro. Verifique: 1) Se é um CPF válido 2) Qualidade da imagem 3) Se há sinais de falsificação 4) Se o número está legível. Extraia: nome completo, número do CPF.",
      selfie: "Analise esta selfie para verificação de identidade. Verifique: 1) Se é uma foto real de uma pessoa 2) Qualidade da imagem 3) Se a face está claramente visível 4) Se não há sinais de deepfake ou manipulação.",
      address_proof: "Analise este comprovante de endereço brasileiro. Verifique: 1) Se é um documento válido (conta de luz, água, telefone, etc.) 2) Se a data está recente (últimos 3 meses) 3) Se o endereço está legível 4) Se há sinais de falsificação. Extraia: nome, endereço completo, data do documento.",
      criminal_background: "Analise esta certidão de antecedentes criminais brasileira. Verifique: 1) Se é uma certidão válida 2) Se está dentro do prazo de validade 3) Se há sinais de falsificação 4) Se o nome está legível. Extraia: nome completo, data de emissão, validade."
    };

    const prompt = documentPrompts[documentType as keyof typeof documentPrompts] || 
      "Analise este documento e verifique sua autenticidade e qualidade.";

    // Chamar OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de documentos brasileiros. Analise o documento e retorne APENAS um JSON válido com a seguinte estrutura:
{
  "documentType": "tipo detectado",
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "fraudIndicators": ["lista de indicadores de fraude"],
  "qualityIssues": ["lista de problemas de qualidade"],
  "recommendations": "recomendação de aprovação/rejeição",
  "detectedInfo": {"informações extraídas do documento"}
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`Erro na API do OpenAI: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('Resposta vazia da API do OpenAI');
    }

    // Parse do JSON da resposta
    let analysis: AIAnalysisResult;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta da IA:', analysisText);
      // Fallback para análise básica
      analysis = {
        documentType: documentType,
        isValid: false,
        confidence: 0.5,
        fraudIndicators: ['Erro na análise automática'],
        qualityIssues: ['Resposta da IA não pôde ser processada'],
        recommendations: 'Requer revisão manual devido a erro na análise automática',
        detectedInfo: {}
      };
    }

    // Verificar duplicatas por hash da imagem (simulado)
    const duplicateCheck = await supabaseClient
      .from('kyc_documents')
      .select('id, user_id')
      .eq('file_url', imageUrl)
      .neq('id', documentId);

    if (duplicateCheck.data && duplicateCheck.data.length > 0) {
      analysis.fraudIndicators.push('Documento duplicado detectado');
      analysis.confidence *= 0.3; // Reduzir confiança drasticamente
    }

    // Salvar análise no banco
    const { error: saveError } = await supabaseClient
      .from('kyc_ai_analysis')
      .insert({
        document_id: documentId,
        analysis_result: analysis,
        confidence_score: analysis.confidence,
        fraud_indicators: analysis.fraudIndicators,
        recommendations: analysis.recommendations,
        ai_model_version: 'gpt-4o'
      });

    if (saveError) {
      console.error('Erro ao salvar análise:', saveError);
    }

    // Atualizar status do documento baseado na análise
    let newStatus = 'pending';
    let notes = null;

    if (analysis.confidence < 0.3 || analysis.fraudIndicators.length > 2) {
      newStatus = 'rejected';
      notes = `Rejeitado automaticamente: ${analysis.fraudIndicators.join(', ')}`;
    } else if (analysis.confidence > 0.8 && analysis.fraudIndicators.length === 0) {
      newStatus = 'approved';
      notes = 'Aprovado automaticamente pela IA';
    } else {
      notes = `Análise de IA: ${analysis.recommendations}`;
    }

    // Atualizar documento
    const { error: updateError } = await supabaseClient
      .from('kyc_documents')
      .update({
        notes: notes,
        is_verified: newStatus === 'approved',
        verified_at: newStatus === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Erro ao atualizar documento:', updateError);
    }

    // Log da ação para auditoria
    const { error: auditError } = await supabaseClient
      .from('kyc_admin_actions')
      .insert({
        document_id: documentId,
        admin_id: '00000000-0000-0000-0000-000000000000', // ID do sistema de IA
        action: newStatus === 'approved' ? 'approved' : 'flagged',
        previous_status: 'pending',
        new_status: newStatus,
        notes: `Análise automática de IA - Confiança: ${(analysis.confidence * 100).toFixed(1)}%`,
        metadata: {
          ai_analysis: true,
          confidence: analysis.confidence,
          fraud_indicators: analysis.fraudIndicators
        }
      });

    if (auditError) {
      console.error('Erro ao salvar auditoria:', auditError);
    }

    console.log(`Análise concluída para documento ${documentId} - Status: ${newStatus}, Confiança: ${analysis.confidence}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        newStatus,
        message: 'Análise concluída com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na análise do documento:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});