-- Criar contratos para pagamentos existentes que não possuem contratos
INSERT INTO contracts (
  job_id,
  client_id, 
  provider_id,
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
LEFT JOIN jobs j ON ep.job_id = j.id
WHERE ep.status = 'held' 
  AND ep.job_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contracts c WHERE c.job_id = ep.job_id
  );

-- Atualizar jobs para referenciar os contratos criados
UPDATE jobs 
SET contract_id = c.id,
    status = 'in_progress'
FROM contracts c 
WHERE jobs.id = c.job_id 
  AND jobs.contract_id IS NULL
  AND EXISTS (
    SELECT 1 FROM escrow_payments ep 
    WHERE ep.job_id = jobs.id AND ep.status = 'held'
  );