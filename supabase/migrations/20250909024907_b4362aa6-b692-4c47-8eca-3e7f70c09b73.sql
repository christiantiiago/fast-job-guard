-- Corrigir taxas premium: 5% para cliente + 5% para prestador = 10% total
UPDATE fee_rules 
SET 
  client_fee_premium = 5.00,
  provider_fee_premium = 5.00
WHERE is_active = true;