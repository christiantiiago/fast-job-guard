-- Corrigir search_path das funções existentes
ALTER FUNCTION can_provider_propose(UUID, UUID) SET search_path = public;
ALTER FUNCTION filter_chat_content(TEXT) SET search_path = public;
ALTER FUNCTION apply_content_filter() SET search_path = public;