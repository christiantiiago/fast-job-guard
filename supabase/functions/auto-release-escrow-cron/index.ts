import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔄 Starting automatic escrow release process...');

    // Fetch escrow payments that are due for release
    const { data: escrowPayments, error: fetchError } = await supabase
      .from('escrow_payments')
      .select(`
        *,
        jobs (
          id, 
          title, 
          client_id, 
          provider_id,
          status
        )
      `)
      .eq('status', 'held')
      .lt('release_date', new Date().toISOString());

    if (fetchError) {
      console.error('❌ Error fetching escrow payments:', fetchError);
      throw fetchError;
    }

    if (!escrowPayments || escrowPayments.length === 0) {
      console.log('ℹ️ No escrow payments ready for automatic release');
      return new Response(JSON.stringify({
        success: true,
        message: 'No escrow payments to release',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${escrowPayments.length} escrow payments to process`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const payment of escrowPayments) {
      try {
        console.log(`💰 Processing payment ${payment.id} for job ${payment.job_id}`);

        // Check if job is still in waiting_approval status
        if (payment.jobs.status !== 'waiting_approval') {
          console.log(`⚠️ Skipping payment ${payment.id} - job status is ${payment.jobs.status}, not waiting_approval`);
          continue;
        }

        // Check if provider is premium to determine fee
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', payment.provider_id)
          .eq('status', 'active')
          .maybeSingle();

        const isPremium = !!subscription;
        const feePercentage = isPremium ? 5 : 7.5; // 5% for premium, 7.5% for standard
        const platformFee = payment.amount * (feePercentage / 100);
        const netAmount = payment.amount - platformFee;

        console.log(`💳 Processing payment: Amount=${payment.amount}, Fee=${platformFee.toFixed(2)} (${feePercentage}%), Net=${netAmount.toFixed(2)}, Premium=${isPremium}`);

        // Update escrow payment status to released
        const { error: updateError } = await supabase
          .from('escrow_payments')
          .update({
            status: 'released',
            platform_fee: platformFee,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error(`❌ Error updating escrow payment ${payment.id}:`, updateError);
          throw updateError;
        }

        // Update job status to completed
        const { error: jobUpdateError } = await supabase
          .from('jobs')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.job_id);

        if (jobUpdateError) {
          console.error(`❌ Error updating job ${payment.job_id}:`, jobUpdateError);
          throw jobUpdateError;
        }

        // Create notifications for both client and provider
        const notifications = [
          {
            user_id: payment.client_id,
            type: 'payment_released',
            title: 'Pagamento Liberado Automaticamente',
            message: `O pagamento de R$ ${payment.amount.toFixed(2)} foi liberado automaticamente para o trabalho "${payment.jobs.title}".`,
            data: {
              job_id: payment.job_id,
              escrow_id: payment.id,
              amount: payment.amount,
              fee: platformFee,
              net_amount: netAmount
            },
            priority: 2
          },
          {
            user_id: payment.provider_id,
            type: 'payment_received',
            title: 'Pagamento Recebido!',
            message: `Você recebeu R$ ${netAmount.toFixed(2)} pelo trabalho "${payment.jobs.title}". Taxa aplicada: ${feePercentage}% ${isPremium ? '(Premium)' : '(Padrão)'}.`,
            data: {
              job_id: payment.job_id,
              escrow_id: payment.id,
              amount: payment.amount,
              fee: platformFee,
              net_amount: netAmount,
              is_premium: isPremium
            },
            priority: 3
          }
        ];

        const { error: notificationError } = await supabase
          .from('real_time_notifications')
          .insert(notifications);

        if (notificationError) {
          console.error(`⚠️ Error creating notifications for payment ${payment.id}:`, notificationError);
          // Don't fail the whole process for notification errors
        }

        console.log(`✅ Successfully processed payment ${payment.id}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing payment ${payment.id}:`, error);
        errorCount++;
        errors.push({
          paymentId: payment.id,
          error: error.message
        });
      }
    }

    console.log(`🎯 Automatic release process completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Automatic escrow release completed',
      processed: successCount,
      errors: errorCount,
      details: errors
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Fatal error in auto-release-escrow-cron:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});