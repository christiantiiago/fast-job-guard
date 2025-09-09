-- Adicionar campos de bio e fotos de trabalhos aos perfis
ALTER TABLE public.profiles 
ADD COLUMN bio TEXT,
ADD COLUMN work_photos TEXT[] DEFAULT '{}',
ADD COLUMN portfolio_description TEXT;

-- Adicionar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela profiles se não existir
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();