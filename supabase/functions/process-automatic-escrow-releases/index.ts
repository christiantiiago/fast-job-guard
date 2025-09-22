import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[${new Date().toISOString()}] ${step}`, details || '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting automatic escrow release process');
    
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find escrow payments that are ready for automatic release (must be in waiting_approval status)
    const { data: expiredEscrows, error: fetchError } = await supabase
      .from('escrow_payments')
      .select(`
        id,
        amount,
        job_id,
        client_id,
        provider_id,
        release_date,
        created_at,
        jobs:job_id(id, title, status, client_id, provider_id)
      `)
      .eq('status', 'held')
      .lt('release_date', new Date().toISOString());
    
    if (fetchError) {
      logStep('Error fetching expired escrows', fetchError);
      throw fetchError;
    }

    logStep(`Found ${expiredEscrows?.length || 0} escrow payments ready for release`);

    if (!expiredEscrows || expiredEscrows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No escrow payments ready for automatic release',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    const errors: any[] = [];

    // Process each expired escrow payment
    for (const escrow of expiredEscrows) {
      try {
        logStep(`Processing escrow payment ${escrow.id}`, {
          amount: escrow.amount,
          job_id: escrow.job_id,
          job_status: escrow.jobs?.status,
          release_date: escrow.release_date
        });

        // Only auto-release if job is in waiting_approval status
        if (escrow.jobs?.status !== 'waiting_approval') {
          logStep(`Skipping escrow ${escrow.id} - job not in waiting_approval status`, {
            current_status: escrow.jobs?.status
          });
          continue;
        }

        // Check if provider is premium and calculate dynamic fees
        const { data: isPremium } = await supabase
          .rpc('is_premium_user', { target_user_id: escrow.provider_id });

        // Get current fee rules
        const { data: feeRules } = await supabase
          .from('fee_rules')
          .select('provider_fee_premium, provider_fee_standard')
          .eq('is_active', true)
          .single();

        const feePercentage = isPremium 
          ? (feeRules?.provider_fee_premium || 5.0) 
          : (feeRules?.provider_fee_standard || 7.5);

        // Calculate amounts - provider receives amount minus platform fee
        const platformFee = Math.round((escrow.amount * feePercentage) / 100 * 100) / 100;
        const providerAmount = Math.round((escrow.amount - platformFee) * 100) / 100;

        // Update escrow payment status to released
        const { error: updateError } = await supabase
          .from('escrow_payments')
          .update({
            status: 'released',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', escrow.id);

        if (updateError) {
          logStep(`Error updating escrow ${escrow.id}`, updateError);
          errors.push({ escrow_id: escrow.id, error: updateError });
          continue;
        }

        // Update job status to completed
        const { error: jobUpdateError } = await supabase
          .from('jobs')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrow.job_id);

        if (jobUpdateError) {
          logStep(`Error updating job ${escrow.job_id}`, jobUpdateError);
          // Don't fail the escrow release for job update errors
        }

        // Create notifications for both client and provider with premium info
        const notifications = [
          {
            user_id: escrow.provider_id,
            type: 'escrow_released_auto',
            title: 'Pagamento Liberado Automaticamente',
            message: `Seu pagamento líquido de R$ ${providerAmount.toFixed(2)} foi liberado automaticamente ${isPremium ? '(Premium - 5% de taxa)' : '(7.5% de taxa)'} após 5 dias.`,
            data: {
              escrow_id: escrow.id,
              job_id: escrow.job_id,
              amount: providerAmount,
              originalAmount: escrow.amount,
              platformFee,
              feePercentage,
              isPremium,
              release_type: 'automatic'
            }
          },
          {
            user_id: escrow.client_id,
            type: 'escrow_released_auto',
            title: 'Pagamento Liberado Automaticamente',
            message: `O pagamento de R$ ${escrow.amount.toFixed(2)} foi liberado automaticamente para o prestador (líquido: R$ ${providerAmount.toFixed(2)}).`,
            data: {
              escrow_id: escrow.id,
              job_id: escrow.job_id,
              amount: providerAmount,
              originalAmount: escrow.amount,
              platformFee,
              release_type: 'automatic'
            }
          }
        ];

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          logStep(`Error creating notifications for escrow ${escrow.id}`, notificationError);
          // Don't fail the process for notification errors
        }

        // Create real-time notifications with premium info
        const realTimeNotifications = [
          {
            user_id: escrow.provider_id,
            type: 'payment',
            title: '💰 Pagamento Liberado',
            message: `R$ ${providerAmount.toFixed(2)} foi creditado automaticamente ${isPremium ? '(Premium)' : ''}`,
            data: {
              escrow_id: escrow.id,
              job_id: escrow.job_id,
              amount: providerAmount,
              originalAmount: escrow.amount,
              isPremium
            }
          },
          {
            user_id: escrow.client_id,
            type: 'payment',
            title: '✅ Trabalho Concluído',
            message: 'Pagamento foi liberado automaticamente para o prestador',
            data: {
              escrow_id: escrow.id,
              job_id: escrow.job_id,
              amount: providerAmount,
              originalAmount: escrow.amount
            }
          }
        ];

        const { error: realTimeError } = await supabase
          .from('real_time_notifications')
          .insert(realTimeNotifications);

        if (realTimeError) {
          logStep(`Error creating real-time notifications for escrow ${escrow.id}`, realTimeError);
        }

        logStep(`Successfully processed escrow payment ${escrow.id}`);
        processedCount++;

      } catch (error) {
        logStep(`Error processing escrow ${escrow.id}`, error);
        errors.push({ escrow_id: escrow.id, error: error.message });
      }
    }

    logStep(`Automatic escrow release completed`, {
      total_found: expiredEscrows.length,
      processed: processedCount,
      errors: errors.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automatic escrow release process completed',
        processed: processedCount,
        total_found: expiredEscrows.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Fatal error in automatic escrow release', error);
    console.error('Fatal error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});