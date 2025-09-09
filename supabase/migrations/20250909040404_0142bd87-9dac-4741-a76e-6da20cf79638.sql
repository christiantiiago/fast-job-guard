-- Update fee rules with correct percentages
UPDATE public.fee_rules 
SET 
  client_fee_standard = 7.5,
  client_fee_premium = 5.0,
  provider_fee_standard = 7.5,
  provider_fee_premium = 5.0
WHERE is_active = true;