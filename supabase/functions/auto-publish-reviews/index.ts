import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[AUTO-PUBLISH-REVIEWS] Starting auto-publication process');

    // Chamar função para auto-publicar reviews
    const { error } = await supabase.rpc('auto_publish_reviews');

    if (error) {
      console.error('[AUTO-PUBLISH-REVIEWS] Error:', error);
      throw error;
    }

    // Buscar reviews que foram publicadas agora para notificar
    const { data: publishedReviews, error: fetchError } = await supabase
      .from('reviews')
      .select(`
        id,
        target_id,
        author_id,
        job_id,
        rating,
        is_anonymous,
        created_at,
        published_at,
        jobs!inner(title),
        author:profiles!author_id(full_name),
        target:profiles!target_id(full_name)
      `)
      .eq('status', 'published')
      .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

    if (fetchError) {
      console.error('[AUTO-PUBLISH-REVIEWS] Fetch error:', fetchError);
    }

    if (publishedReviews && publishedReviews.length > 0) {
      console.log(`[AUTO-PUBLISH-REVIEWS] Found ${publishedReviews.length} newly published reviews`);

      // Criar notificações para os usuários que receberam avaliações
      for (const review of publishedReviews) {
        const authorName = review.is_anonymous ? 'Usuário Anônimo' : review.author?.full_name || 'Usuário';
        
        await supabase
          .from('notifications')
          .insert({
            user_id: review.target_id,
            type: 'review_published',
            title: 'Nova Avaliação Publicada',
            message: `${authorName} avaliou seu trabalho em "${review.jobs?.title}" com ${review.rating} estrelas.`,
            data: {
              review_id: review.id,
              job_id: review.job_id,
              rating: review.rating,
              is_anonymous: review.is_anonymous
            }
          });
      }
    }

    console.log('[AUTO-PUBLISH-REVIEWS] Auto-publication completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        publishedCount: publishedReviews?.length || 0 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('[AUTO-PUBLISH-REVIEWS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});