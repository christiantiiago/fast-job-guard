-- Criar contratos manualmente para os jobs válidos existentes

-- Primeiro, verificar quais jobs existem com pagamentos held
-- Job: b8bd78dd-1ded-44b3-8fde-5f7f414c4238 - Faxina Geral
-- Job: f4a2e2af-e60a-46c3-83d0-4baeb12506e7

-- Criar propostas simples
INSERT INTO proposals (
  job_id,
  provider_id,
  price,
  message,
  status,
  created_at
) VALUES 
(
  'b8bd78dd-1ded-44b3-8fde-5f7f414c4238',
  '510e74b4-0905-41c6-8935-5fa594c8211f', 
  180.00,
  'Proposta aceita automaticamente com pagamento confirmado',
  'accepted'::proposal_status,
  NOW()
);

-- Buscar o ID da proposta criada e criar contrato
WITH new_proposal AS (
  SELECT id FROM proposals 
  WHERE job_id = 'b8bd78dd-1ded-44b3-8fde-5f7f414c4238'
  AND provider_id = '510e74b4-0905-41c6-8935-5fa594c8211f'
  AND status = 'accepted'::proposal_status
  LIMIT 1
)
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
  'b8bd78dd-1ded-44b3-8fde-5f7f414c4238',
  'b76ebfbc-1eab-4723-b5b8-0cf6eae8e6ab',
  '510e74b4-0905-41c6-8935-5fa594c8211f',
  np.id,
  180.00,
  'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - FAXINA GERAL

Valor: R$ 180,00
Pagamento confirmado e em garantia.
Contrato gerado automaticamente.',
  180.00,
  'active',
  true,
  true,
  NOW(),
  NOW()
FROM new_proposal np;

-- Atualizar o job para in_progress
UPDATE jobs 
SET status = 'in_progress'::job_status,
    provider_id = '510e74b4-0905-41c6-8935-5fa594c8211f',
    final_price = 180.00
WHERE id = 'b8bd78dd-1ded-44b3-8fde-5f7f414c4238';