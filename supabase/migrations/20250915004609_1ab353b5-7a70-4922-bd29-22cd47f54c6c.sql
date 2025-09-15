-- Corrigir relacionamentos duplicados e conflitantes na tabela jobs

-- Primeiro, verificar se service_category_id existe e se tem dados
DO $$
BEGIN
  -- Se service_category_id existe, copiar os dados para category_id onde category_id for NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='service_category_id') THEN
    UPDATE jobs 
    SET category_id = service_category_id 
    WHERE category_id IS NULL AND service_category_id IS NOT NULL;
    
    -- Remover a coluna service_category_id para evitar conflitos
    ALTER TABLE jobs DROP COLUMN IF EXISTS service_category_id;
  END IF;
END
$$;

-- Garantir que temos foreign key correta para category_id
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_jobs_category;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_jobs_service_category;

-- Adicionar foreign key constraint correta
ALTER TABLE jobs 
ADD CONSTRAINT fk_jobs_category 
FOREIGN KEY (category_id) 
REFERENCES service_categories(id) 
ON DELETE SET NULL;

-- Corrigir relacionamento com addresses
-- Verificar se a tabela job_addresses existe e migrar dados se necessário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='job_addresses') THEN
    -- Se existir job_addresses, migrar os dados
    UPDATE jobs 
    SET address_id = ja.address_id
    FROM job_addresses ja 
    WHERE jobs.id = ja.job_id AND jobs.address_id IS NULL;
    
    -- Depois de migrar, remover a tabela job_addresses
    DROP TABLE IF EXISTS job_addresses;
  END IF;
END
$$;

-- Garantir foreign key para addresses
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_jobs_address;
ALTER TABLE jobs 
ADD CONSTRAINT fk_jobs_address 
FOREIGN KEY (address_id) 
REFERENCES addresses(id) 
ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_address_id ON jobs(address_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_provider_id ON jobs(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);