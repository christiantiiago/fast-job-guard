-- Criar sistema de contratos entre clientes e prestadores
-- Tabela para armazenar contratos automaticos gerados ao aceitar propostas

CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  -- Termos do contrato
  agreed_price DECIMAL(10,2) NOT NULL,
  agreed_deadline TIMESTAMP WITH TIME ZONE,
  terms_and_conditions TEXT NOT NULL,
  
  -- Status e assinaturas
  status TEXT CHECK (status IN ('pending', 'signed', 'active', 'completed', 'cancelled', 'disputed')) DEFAULT 'pending',
  client_signed BOOLEAN DEFAULT false,
  provider_signed BOOLEAN DEFAULT false,
  client_signed_at TIMESTAMP WITH TIME ZONE,
  provider_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Escrow e pagamento
  escrow_amount DECIMAL(10,2),
  escrow_released BOOLEAN DEFAULT false,
  escrow_released_at TIMESTAMP WITH TIME ZONE,
  
  -- Milestones de entrega
  milestones JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- Habilitar RLS na tabela de contratos
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contratos
CREATE POLICY "Clientes podem ver seus contratos" 
ON public.contracts 
FOR SELECT 
USING (client_id = auth.uid());

CREATE POLICY "Prestadores podem ver seus contratos" 
ON public.contracts 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "Partes do contrato podem atualizar (assinar)" 
ON public.contracts 
FOR UPDATE 
USING (client_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Sistema pode criar contratos" 
ON public.contracts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar contratos" 
ON public.contracts 
FOR ALL 
USING (is_admin());

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trigger_update_contract_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_updated_at();

-- Adicionar campo contract_id na tabela jobs para referência
ALTER TABLE public.jobs ADD COLUMN contract_id UUID REFERENCES public.contracts(id);

-- Função para gerar contrato automaticamente ao aceitar proposta
CREATE OR REPLACE FUNCTION generate_contract_on_proposal_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  contract_terms TEXT;
BEGIN
  -- Só gerar contrato quando proposta for aceita
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Buscar dados do job
    SELECT * INTO job_record 
    FROM public.jobs 
    WHERE id = NEW.job_id;
    
    -- Gerar termos padrão do contrato
    contract_terms := 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO: ' || job_record.title || '

2. DESCRIÇÃO: ' || job_record.description || '

3. VALOR: R$ ' || NEW.price || '

4. PRAZO DE ENTREGA: ' || COALESCE(NEW.delivery_date::text, 'A combinar') || '

5. RESPONSABILIDADES:
   - O CONTRATANTE se compromete a fornecer todas as informações necessárias
   - O PRESTADOR se compromete a executar o serviço conforme especificado

6. PAGAMENTO: O pagamento será liberado mediante conclusão e aprovação do serviço

7. Este contrato é regido pelos Termos de Uso da plataforma Job Fast.';

    -- Criar contrato
    INSERT INTO public.contracts (
      job_id,
      client_id,
      provider_id, 
      proposal_id,
      agreed_price,
      agreed_deadline,
      terms_and_conditions,
      escrow_amount,
      status
    ) VALUES (
      NEW.job_id,
      job_record.client_id,
      NEW.provider_id,
      NEW.id,
      NEW.price,
      NEW.delivery_date,
      contract_terms,
      NEW.price,
      'pending'
    );
    
    -- Atualizar job para status in_proposal e adicionar provider
    UPDATE public.jobs 
    SET 
      provider_id = NEW.provider_id,
      status = 'in_proposal',
      final_price = NEW.price
    WHERE id = NEW.job_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para gerar contrato ao aceitar proposta
CREATE TRIGGER trigger_generate_contract_on_proposal_acceptance
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION generate_contract_on_proposal_acceptance();

-- Índices para performance
CREATE INDEX idx_contracts_job_id ON public.contracts(job_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_provider_id ON public.contracts(provider_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);