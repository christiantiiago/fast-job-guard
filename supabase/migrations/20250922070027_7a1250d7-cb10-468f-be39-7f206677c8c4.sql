-- Criar contratos para jobs válidos com casting correto

-- 1. Criar propostas aceitas para pagamentos com jobs válidos  
INSERT INTO proposals (
  job_id,
  provider_id,
  price,
  message,
  status,
  created_at
)
SELECT DISTINCT
  ep.job_id,
  ep.provider_id,
  ep.amount,
  'Proposta gerada automaticamente com base no pagamento confirmado.',
  'accepted'::proposal_status, -- Cast para o tipo enum correto
  ep.created_at
FROM escrow_payments ep
INNER JOIN jobs j ON j.id = ep.job_id -- Apenas jobs que existem
WHERE ep.status = 'held'
  AND NOT EXISTS (
    SELECT 1 FROM proposals p 
    WHERE p.job_id = ep.job_id 
    AND p.provider_id = ep.provider_id
    AND p.status = 'accepted'::proposal_status
  );

-- 2. Criar contratos para pagamentos válidos
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
SELECT 
  ep.job_id,
  ep.client_id,
  ep.provider_id,
  p.id,
  ep.amount,
  CONCAT(
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS', E'\n\n',
    '1. OBJETO: ', COALESCE(j.title, 'Serviço contratado'), E'\n\n',
    '2. DESCRIÇÃO: ', COALESCE(j.description, 'Prestação de serviços conforme acordado'), E'\n\n',
    '3. VALOR: R$ ', REPLACE(ep.amount::text, '.', ','), E'\n\n',
    '4. RESPONSABILIDADES:', E'\n',
    '   - O CONTRATANTE se compromete a fornecer todas as informações necessárias', E'\n',
    '   - O PRESTADOR se compromete a executar o serviço conforme especificado', E'\n\n',
    '5. PAGAMENTO: O pagamento foi efetuado e está protegido em garantia, sendo liberado automaticamente após 5 dias da conclusão ou mediante aprovação manual do cliente.', E'\n\n',
    '6. Este contrato é regido pelos Termos de Uso da plataforma Job Fast.', E'\n\n',
    'Contrato gerado automaticamente em ', NOW()::timestamp
  ),
  ep.amount,
  'active',
  true,
  true,
  NOW(),
  NOW()
FROM escrow_payments ep
INNER JOIN jobs j ON j.id = ep.job_id
INNER JOIN proposals p ON p.job_id = ep.job_id AND p.provider_id = ep.provider_id AND p.status = 'accepted'::proposal_status
WHERE ep.status = 'held' 
  AND NOT EXISTS (
    SELECT 1 FROM contracts c WHERE c.job_id = ep.job_id
  );

-- 3. Atualizar jobs para referenciar os contratos criados
UPDATE jobs 
SET contract_id = c.id,
    status = 'in_progress'::job_status, -- Cast para job_status também
    provider_id = c.provider_id,
    final_price = c.agreed_price
FROM contracts c 
WHERE jobs.id = c.job_id 
  AND jobs.contract_id IS NULL;