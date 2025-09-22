-- Verificar e adicionar colunas faltantes nas tabelas para AbacatePay

-- Adicionar external_payment_id na tabela job_boosts se não existir
ALTER TABLE job_boosts 
ADD COLUMN IF NOT EXISTS external_payment_id TEXT;

-- Adicionar activated_at na tabela job_boosts se não existir
ALTER TABLE job_boosts 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Verificar se a tabela escrow_payments tem external_payment_id
ALTER TABLE escrow_payments 
ADD COLUMN IF NOT EXISTS external_payment_id TEXT;

-- Verificar se a tabela subscriptions tem external_payment_id
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS external_payment_id TEXT;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_job_boosts_external_payment_id ON job_boosts(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_external_payment_id ON escrow_payments(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_payment_id ON subscriptions(external_payment_id);

-- Corrigir políticas RLS para job_boosts (permitir insert usando service role)
DROP POLICY IF EXISTS "System can update boosts" ON job_boosts;
CREATE POLICY "System can create and update boosts" 
ON job_boosts 
FOR ALL 
USING (true);

-- Garantir que escrow_payments pode ser inserido pelo sistema
DROP POLICY IF EXISTS "System can create escrow payments" ON escrow_payments;
CREATE POLICY "System can create and update escrow payments" 
ON escrow_payments 
FOR ALL 
USING (true);

-- Garantir que subscriptions pode ser inserido pelo sistema  
DROP POLICY IF EXISTS "System can create subscriptions" ON subscriptions;
CREATE POLICY "System can create and update subscriptions" 
ON subscriptions 
FOR ALL 
USING (true);