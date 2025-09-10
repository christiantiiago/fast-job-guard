-- Criar trigger para análise automática de IA nos documentos KYC
CREATE OR REPLACE FUNCTION trigger_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executar para novos documentos inseridos
  IF TG_OP = 'INSERT' THEN
    -- Chamar função edge para análise de IA (usando pg_net)
    SELECT net.http_post(
      url := 'https://yelytezcifyrykxvlbok.supabase.co/functions/v1/analyze-document-ai',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := json_build_object(
        'documentId', NEW.id,
        'documentType', NEW.document_type,
        'imageUrl', NEW.file_url
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger que será executado após inserção de documentos KYC
DROP TRIGGER IF EXISTS kyc_document_ai_analysis_trigger ON kyc_documents;
CREATE TRIGGER kyc_document_ai_analysis_trigger
  AFTER INSERT ON kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- Garantir que a tabela kyc_documents está na publicação realtime
ALTER TABLE kyc_documents REPLICA IDENTITY FULL;
ALTER TABLE kyc_ai_analysis REPLICA IDENTITY FULL;
ALTER TABLE kyc_admin_actions REPLICA IDENTITY FULL;