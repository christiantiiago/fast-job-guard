-- Web Push infrastructure for PWA/mobile-like notifications

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role can manage push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_push_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_push_subscription_updated_at();

CREATE OR REPLACE FUNCTION public.dispatch_web_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://yelytezcifyrykxvlbok.supabase.co/functions/v1/send-web-push',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbHl0ZXpjaWZ5cnlreHZsYm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODEwMTEsImV4cCI6MjA3MjM1NzAxMX0.GoB7I_naVGsVIhZgAaQoQBjTJijJZ-sbEATYZlbAw-k"}'::jsonb,
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.type,
      'data', COALESCE(NEW.data, '{}'::jsonb)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_web_push_on_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_web_push_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_web_push_notification();
