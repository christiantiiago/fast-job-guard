-- Criar tabela de reviews se não existir
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(job_id, reviewer_id, reviewee_id)
);

-- Habilitar RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view reviews they gave or received" ON reviews
  FOR SELECT USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());

CREATE POLICY "Users can create reviews for completed jobs" ON reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE id = job_id 
      AND status = 'completed'
      AND (client_id = auth.uid() OR provider_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (is_admin());

-- Atualizar perfis para começar com rating 5.0
UPDATE profiles 
SET rating_avg = 5.0, rating_count = 1 
WHERE rating_count = 0 OR rating_avg = 0 OR rating_avg IS NULL;

-- Função para recalcular rating médio
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating numeric;
  total_reviews integer;
BEGIN
  -- Calcular nova média e contagem para o avaliado
  SELECT 
    COALESCE(AVG(rating), 5.0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM reviews 
  WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id);
  
  -- Se não há reviews, manter 5.0 com count 1
  IF total_reviews = 0 THEN
    avg_rating := 5.0;
    total_reviews := 1;
  END IF;
  
  -- Atualizar perfil
  UPDATE profiles 
  SET 
    rating_avg = avg_rating,
    rating_count = total_reviews,
    updated_at = now()
  WHERE user_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar rating automaticamente
DROP TRIGGER IF EXISTS update_rating_on_review_insert ON reviews;
CREATE TRIGGER update_rating_on_review_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();

DROP TRIGGER IF EXISTS update_rating_on_review_update ON reviews;
CREATE TRIGGER update_rating_on_review_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();

DROP TRIGGER IF EXISTS update_rating_on_review_delete ON reviews;
CREATE TRIGGER update_rating_on_review_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();