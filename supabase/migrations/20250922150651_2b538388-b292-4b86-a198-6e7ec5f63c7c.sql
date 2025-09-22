-- Atualizar status dos contratos para 'active' já que os pagamentos foram confirmados
UPDATE contracts 
SET status = 'active',
    client_signed = true,
    provider_signed = true,
    client_signed_at = COALESCE(client_signed_at, now()),
    provider_signed_at = COALESCE(provider_signed_at, now())
WHERE job_id IN ('3bfd1f1d-704e-424a-8a7d-85203ff174e0', '3116e678-9a36-441e-b47e-1349c97f3d4b', '29b04544-d055-48b0-b3fa-86909cbe350c')
AND status = 'pending';