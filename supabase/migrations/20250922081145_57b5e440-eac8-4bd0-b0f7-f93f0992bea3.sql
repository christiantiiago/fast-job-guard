-- Configurar cron job para auto-liberação de pagamentos (executa a cada hora)
SELECT cron.schedule(
  'auto-release-escrow-payments',
  '0 * * * *', -- A cada hora no minuto 0
  $$
  SELECT
    net.http_post(
      url:='https://yelytezcifyrykxvlbok.supabase.co/functions/v1/auto-release-escrow-job',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbHl0ZXpjaWZ5cnlreHZsYm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODEwMTEsImV4cCI6MjA3MjM1NzAxMX0.GoB7I_naVGsVIhZgAaQoQBjTJijJZ-sbEATYZlbAw-k"}'::jsonb,
      body:=concat('{"executed_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);