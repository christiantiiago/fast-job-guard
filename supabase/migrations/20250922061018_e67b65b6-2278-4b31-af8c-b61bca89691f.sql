-- Criar trigger para cancelar automaticamente pagamentos escrow quando trabalhos são deletados
CREATE OR REPLACE FUNCTION cancel_escrow_on_job_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancelar todos os pagamentos escrow pendentes/held para este trabalho
  UPDATE escrow_payments 
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE job_id = OLD.id 
    AND status IN ('pending', 'held');
  
  -- Log da ação
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    auth.uid(),
    'AUTO_CANCEL_ESCROW_ON_JOB_DELETE',
    'escrow_payment',
    OLD.id,
    jsonb_build_object(
      'job_id', OLD.id,
      'job_title', OLD.title,
      'reason', 'job_deleted'
    )
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_cancel_escrow_on_job_delete ON jobs;
CREATE TRIGGER trigger_cancel_escrow_on_job_delete
  BEFORE DELETE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION cancel_escrow_on_job_delete();