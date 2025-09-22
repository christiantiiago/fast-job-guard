-- Primeiro, vamos aceitar as propostas que deveriam ter sido aceitas automaticamente
UPDATE proposals 
SET status = 'accepted' 
WHERE job_id IN ('3bfd1f1d-704e-424a-8a7d-85203ff174e0', '3116e678-9a36-441e-b47e-1349c97f3d4b', '29b04544-d055-48b0-b3fa-86909cbe350c')
AND status = 'sent';

-- Atualizar status dos jobs para in_progress
UPDATE jobs 
SET status = 'in_progress', 
    provider_id = (SELECT provider_id FROM escrow_payments WHERE job_id = jobs.id AND status = 'held'),
    final_price = (SELECT amount FROM escrow_payments WHERE job_id = jobs.id AND status = 'held'),
    updated_at = now()
WHERE id IN ('3bfd1f1d-704e-424a-8a7d-85203ff174e0', '3116e678-9a36-441e-b47e-1349c97f3d4b', '29b04544-d055-48b0-b3fa-86909cbe350c');

-- Agora vamos criar os contratos para os pagamentos que já foram efetuados
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
  p.id as proposal_id,
  ep.amount,
  'CONTRATO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO: ' || j.title || '

2. DESCRIÇÃO: ' || j.description || '

3. VALOR: R$ ' || REPLACE(ep.amount::text, '.', ',') || '

4. RESPONSABILIDADES:
   - O CONTRATANTE se compromete a fornecer todas as informações necessárias
   - O PRESTADOR se compromete a executar o serviço conforme especificado

5. PAGAMENTO: O pagamento foi efetuado e está protegido em garantia, sendo liberado automaticamente após 5 dias da conclusão ou mediante aprovação manual do cliente.

6. Este contrato é regido pelos Termos de Uso da plataforma Job Fast.

Contrato gerado em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '',
  ep.amount,
  'active',
  true,
  true,
  now(),
  now()
FROM escrow_payments ep
JOIN jobs j ON ep.job_id = j.id
JOIN proposals p ON p.job_id = ep.job_id AND p.provider_id = ep.provider_id
WHERE ep.status = 'held' 
AND ep.job_id IN ('3bfd1f1d-704e-424a-8a7d-85203ff174e0', '3116e678-9a36-441e-b47e-1349c97f3d4b', '29b04544-d055-48b0-b3fa-86909cbe350c')
AND NOT EXISTS (
  SELECT 1 FROM contracts c WHERE c.job_id = ep.job_id
);