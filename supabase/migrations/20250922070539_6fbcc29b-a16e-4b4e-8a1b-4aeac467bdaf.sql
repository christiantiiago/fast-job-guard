-- Criar contratos usando as propostas existentes

-- Criar contratos para propostas existentes que não têm contratos
INSERT INTO contracts (
  job_id,
  client_id,
  provider_id,
  proposal_id,
  agreed_price,
  terms_and_conditions,
  escrow_amount,
  status,
  client_signed,
  provider_signed,
  client_signed_at,
  provider_signed_at
)
SELECT DISTINCT
  p.job_id,
  j.client_id,
  p.provider_id,
  p.id,
  p.price,
  CONCAT(
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS', E'\n\n',
    '1. OBJETO: ', COALESCE(j.title, 'Serviço contratado'), E'\n\n',
    '2. VALOR: R$ ', p.price::text, E'\n\n',
    '3. PAGAMENTO: Confirmado e em garantia.', E'\n\n',
    'Contrato gerado automaticamente em ', NOW()::timestamp
  ),
  p.price,
  'active',
  true,
  true,
  NOW(),
  NOW()
FROM proposals p
INNER JOIN jobs j ON j.id = p.job_id
INNER JOIN escrow_payments ep ON ep.job_id = p.job_id AND ep.provider_id = p.provider_id
WHERE ep.status = 'held'
  AND NOT EXISTS (
    SELECT 1 FROM contracts c WHERE c.job_id = p.job_id
  );

-- Atualizar jobs para in_progress
UPDATE jobs 
SET status = 'in_progress'::job_status,
    provider_id = c.provider_id,
    final_price = c.agreed_price,
    contract_id = c.id
FROM contracts c 
WHERE jobs.id = c.job_id 
  AND jobs.status != 'in_progress'::job_status;