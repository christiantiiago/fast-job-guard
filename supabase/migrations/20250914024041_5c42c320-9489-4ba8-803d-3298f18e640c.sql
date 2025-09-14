-- Update fee rules to 7.5%
UPDATE public.fee_rules 
SET 
  client_fee_standard = 7.5,
  client_fee_premium = 7.5,
  provider_fee_standard = 7.5,
  provider_fee_premium = 7.5
WHERE is_active = true;