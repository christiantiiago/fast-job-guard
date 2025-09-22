-- Adicionar coluna external_payment_id para job_boosts (pagamentos AbacatePay)
ALTER TABLE job_boosts ADD COLUMN IF NOT EXISTS external_payment_id TEXT;