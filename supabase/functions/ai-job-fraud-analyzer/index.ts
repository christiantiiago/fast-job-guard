// @deno-types="https://deno.land/x/xhr@0.1.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface JobAnalysisRequest {
  jobId: string;
  jobData: {
    title: string;
    description: string;
    budget_min?: number;
    budget_max?: number;
    client_id: string;
  };
  modelName?: string;
}

interface AnalysisResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  fraudIndicators: string[];
  recommendations: string[];
  aiAnalysis: string;
}

// Configurações dos modelos
function getModelSettings(modelName: string = 'gpt-4o-mini') {
  const models = {
    'gpt-4o-mini': {
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.3
    },
    'gpt-4o': {
      model: 'gpt-4o',
      maxTokens: 1500,
      temperature: 0.3
    }
  };
  
  return models[modelName as keyof typeof models] || models['gpt-4o-mini'];
}

async function analyzeJobPosting(
  jobData: JobAnalysisRequest['jobData'],
  model: string,
  maxTokens: number,
  temperature?: number
): Promise<AnalysisResult> {
  console.log(`🤖 Analisando job com modelo: ${model}`);
  
  const prompt = `
Analise este anúncio de trabalho para detectar possíveis fraudes ou problemas:

**Título:** ${jobData.title}
**Descrição:** ${jobData.description}
**Orçamento:** R$ ${jobData.budget_min || 0} - R$ ${jobData.budget_max || 0}

Avalie os seguintes aspectos:
1. Linguagem suspeita ou promessas irreais
2. Solicitação de informações pessoais/financeiras
3. Valores muito acima ou abaixo do mercado
4. Descrições vagas ou confusas
5. Urgência excessiva
6. Sinais de possível esquema financeiro

Responda em JSON com:
{
  "riskScore": 0-100,
  "riskLevel": "low/medium/high",
  "fraudIndicators": ["lista de indicadores encontrados"],
  "recommendations": ["recomendações de ação"],
  "aiAnalysis": "análise detalhada em português"
}
`;

  try {
    const requestBody: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em detecção de fraudes em plataformas de trabalho. Analise cuidadosamente e responda sempre em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    // Configurar parâmetros baseado no modelo
    if (model.includes('gpt-5') || model.includes('o3') || model.includes('o4')) {
      requestBody.max_completion_tokens = maxTokens;
      // Não incluir temperature para modelos mais novos
    } else {
      requestBody.max_tokens = maxTokens;
      if (temperature !== undefined) {
        requestBody.temperature = temperature;
      }
    }

    console.log(`📡 Fazendo requisição para OpenAI com modelo: ${model}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro da OpenAI (${response.status}):`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Resposta da OpenAI recebida');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Formato de resposta inválido da OpenAI');
    }

    const content = data.choices[0].message.content;
    console.log('📄 Conteúdo da análise:', content);

    try {
      const analysis = JSON.parse(content);
      
      // Validar estrutura
      if (!analysis.riskScore || !analysis.riskLevel || !analysis.fraudIndicators || !analysis.recommendations) {
        throw new Error('Estrutura de resposta inválida');
      }

      return {
        riskScore: Math.min(100, Math.max(0, analysis.riskScore)),
        riskLevel: ['low', 'medium', 'high'].includes(analysis.riskLevel) ? analysis.riskLevel : 'medium',
        fraudIndicators: Array.isArray(analysis.fraudIndicators) ? analysis.fraudIndicators : [],
        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
        aiAnalysis: analysis.aiAnalysis || 'Análise concluída'
      };
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('📄 Conteúdo que falhou:', content);
      
      // Fallback: análise baseada em palavras-chave
      return await fallbackAnalysis(jobData);
    }
  } catch (error) {
    console.error('❌ Erro na análise AI:', error);
    throw error;
  }
}

async function fallbackAnalysis(jobData: JobAnalysisRequest['jobData']): Promise<AnalysisResult> {
  console.log('🔄 Usando análise de fallback...');
  
  const suspiciousKeywords = [
    'dinheiro fácil', 'ganhe muito', 'sem experiência', 'urgente', 'transferência',
    'depósito', 'conta bancária', 'dados pessoais', 'cpf', 'rg', 'cartão'
  ];
  
  const text = `${jobData.title} ${jobData.description}`.toLowerCase();
  const foundKeywords = suspiciousKeywords.filter(keyword => text.includes(keyword));
  
  const riskScore = Math.min(100, foundKeywords.length * 15);
  const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
  
  return {
    riskScore,
    riskLevel,
    fraudIndicators: foundKeywords.length > 0 ? [`Palavras suspeitas encontradas: ${foundKeywords.join(', ')}`] : [],
    recommendations: riskScore > 30 ? ['Revisar manualmente este job', 'Verificar histórico do cliente'] : ['Job parece seguro'],
    aiAnalysis: `Análise automática detectou ${foundKeywords.length} indicadores suspeitos. Score de risco: ${riskScore}/100`
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AI Fraud Detection request iniciada');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const requestData: JobAnalysisRequest = await req.json();
    console.log('📥 Dados recebidos:', { jobId: requestData.jobId, hasJobData: !!requestData.jobData });

    if (!requestData.jobId || !requestData.jobData) {
      throw new Error('jobId e jobData são obrigatórios');
    }

    const modelSettings = getModelSettings(requestData.modelName);
    console.log('⚙️ Configurações do modelo:', modelSettings);
    
    // Análise do job
    const analysis = await analyzeJobPosting(
      requestData.jobData,
      modelSettings.model,
      modelSettings.maxTokens,
      modelSettings.temperature
    );

    console.log('✅ Análise concluída:', { riskScore: analysis.riskScore, riskLevel: analysis.riskLevel });

    // Salvar resultado no banco
    const { error: saveError } = await supabase
      .from('fraud_analysis_logs')
      .insert({
        entity_id: requestData.jobId,
        type: 'job_posting',
        risk_score: analysis.riskScore,
        risk_level: analysis.riskLevel,
        fraud_indicators: analysis.fraudIndicators,
        recommendations: analysis.recommendations,
        ai_analysis: analysis.aiAnalysis,
        requires_review: analysis.riskScore >= 30
      });

    if (saveError) {
      console.error('❌ Erro ao salvar análise:', saveError);
    } else {
      console.log('💾 Análise salva no banco com sucesso');
    }

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na AI fraud detection:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});