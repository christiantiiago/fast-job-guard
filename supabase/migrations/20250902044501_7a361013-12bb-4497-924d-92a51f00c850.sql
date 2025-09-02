-- Insert default fee rules for the platform
INSERT INTO public.fee_rules (name, client_fee_standard, client_fee_premium, provider_fee_standard, provider_fee_premium, is_active)
VALUES ('Default', 5.00, 3.50, 5.00, 3.50, true)
ON CONFLICT DO NOTHING;