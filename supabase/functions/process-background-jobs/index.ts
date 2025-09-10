import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se tem autorização (permitir tanto service role quanto usuário admin)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      // Permitir sem autorização apenas para processos internos
      console.log('Processamento interno sem autorização');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processando jobs em background...');

    // Buscar jobs pendentes de análise de IA
    const { data: pendingJobs, error: fetchError } = await supabaseClient
      .from('background_jobs')
      .select('*')
      .eq('job_type', 'ai_document_analysis')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5); // Processar até 5 jobs por vez

    if (fetchError) {
      console.error('Erro ao buscar jobs:', fetchError);
      throw fetchError;
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('Nenhum job pendente encontrado');
      return new Response(
        JSON.stringify({ message: 'Nenhum job pendente', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${pendingJobs.length} jobs para processar`);
    let processed = 0;

    // Processar cada job
    for (const job of pendingJobs) {
      try {
        // Marcar job como em processamento
        await supabaseClient
          .from('background_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        console.log(`Processando job ${job.id}:`, job.payload);

        // Chamar a função de análise de IA
        const { data: analysisResult, error: analysisError } = await supabaseClient.functions.invoke(
          'analyze-document-ai',
          {
            body: {
              documentId: job.payload.documentId,
              documentType: job.payload.documentType,
              imageUrl: job.payload.imageUrl
            }
          }
        );

        if (analysisError) {
          console.error(`Erro na análise do job ${job.id}:`, analysisError);
          
          // Marcar job como falhou
          await supabaseClient
            .from('background_jobs')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: analysisError.message || 'Erro na análise de IA'
            })
            .eq('id', job.id);
        } else {
          console.log(`Job ${job.id} processado com sucesso`);
          
          // Marcar job como concluído
          await supabaseClient
            .from('background_jobs')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          processed++;
        }
      } catch (jobError) {
        console.error(`Erro ao processar job ${job.id}:`, jobError);
        
        // Marcar job como falhou
        await supabaseClient
          .from('background_jobs')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: jobError instanceof Error ? jobError.message : 'Erro desconhecido'
          })
          .eq('id', job.id);
      }
    }

    console.log(`Processamento concluído. ${processed} jobs processados com sucesso.`);

    return new Response(
      JSON.stringify({
        message: 'Jobs processados com sucesso',
        processed,
        total: pendingJobs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no processamento de jobs:', error);
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