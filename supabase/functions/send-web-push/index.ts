import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushRequest {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT') ?? 'mailto:suporte@jobfast.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys não configuradas em WEB_PUSH_VAPID_PUBLIC_KEY e WEB_PUSH_VAPID_PRIVATE_KEY');
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const payload = (await req.json()) as PushRequest;

    if (!payload.user_id || !payload.title || !payload.message) {
      throw new Error('Payload inválido para envio de push');
    }

    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', payload.user_id);

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pushBody = JSON.stringify({
      title: payload.title,
      body: payload.message,
      notificationId: payload.notification_id,
      tag: payload.notification_id,
      data: {
        ...(payload.data ?? {}),
        url: (payload.data?.url as string) ?? '/dashboard',
        type: payload.type,
      },
    });

    let sent = 0;
    const invalidSubscriptionIds: string[] = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushBody
        );
        sent += 1;
      } catch (pushError) {
        console.error('Erro enviando push:', pushError);

        const statusCode = (pushError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          invalidSubscriptionIds.push(subscription.id);
        }
      }
    }

    if (invalidSubscriptionIds.length > 0) {
      await supabaseClient
        .from('push_subscriptions')
        .delete()
        .in('id', invalidSubscriptionIds);
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
