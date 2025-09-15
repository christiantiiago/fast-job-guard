-- Adicionar categorias de trabalho para chegar a pelo menos 35

INSERT INTO service_categories (name, slug, description, icon_name) VALUES
-- Serviços para Casa
('Limpeza Residencial', 'limpeza-residencial', 'Limpeza completa de residências', 'home'),
('Jardinagem', 'jardinagem', 'Cuidados com jardins e plantas', 'flower'),
('Pintura Residencial', 'pintura-residencial', 'Pintura de paredes e ambientes', 'paintbrush'),
('Instalação Elétrica', 'instalacao-eletrica', 'Serviços elétricos residenciais', 'zap'),
('Encanamento', 'encanamento', 'Serviços hidráulicos e encanamento', 'droplets'),
('Marcenaria', 'marcenaria', 'Móveis sob medida e reparos', 'hammer'),
('Climatização', 'climatizacao', 'Instalação e manutenção de ar condicionado', 'wind'),
('Vidraçaria', 'vidracaria', 'Instalação e reparo de vidros', 'square'),

-- Serviços Técnicos
('Informática', 'informatica', 'Assistência técnica em computadores', 'computer'),
('Telefonia', 'telefonia', 'Reparo e instalação de telefones', 'phone'),
('Segurança Eletrônica', 'seguranca-eletronica', 'Câmeras e alarmes', 'shield'),
('Automação Residencial', 'automacao-residencial', 'Casa inteligente e automação', 'smartphone'),

-- Serviços Pessoais
('Personal Trainer', 'personal-trainer', 'Treinamento físico personalizado', 'dumbbell'),
('Massagem', 'massagem', 'Massagens terapêuticas e relaxantes', 'hand'),
('Cabeleireiro', 'cabeleireiro', 'Cortes e tratamentos capilares', 'scissors'),
('Manicure/Pedicure', 'manicure-pedicure', 'Cuidados com unhas', 'sparkles'),
('Maquiagem', 'maquiagem', 'Maquiagem para eventos', 'palette'),

-- Serviços Educacionais
('Aulas Particulares', 'aulas-particulares', 'Reforço escolar e aulas', 'book-open'),
('Idiomas', 'idiomas', 'Ensino de línguas estrangeiras', 'globe'),
('Música', 'musica', 'Aulas de instrumentos musicais', 'music'),
('Dança', 'danca', 'Aulas de dança e coreografia', 'music'),

-- Serviços de Transporte
('Mudanças', 'mudancas', 'Serviços de mudança residencial', 'truck'),
('Motorista Particular', 'motorista-particular', 'Serviços de motorista', 'car'),
('Entrega e Courier', 'entrega-courier', 'Entregas rápidas e courier', 'package'),

-- Serviços de Evento
('Fotografia', 'fotografia', 'Fotografia para eventos', 'camera'),
('Filmagem', 'filmagem', 'Videomaker e filmagem', 'video'),
('DJ e Som', 'dj-som', 'Serviços de DJ e sonorização', 'headphones'),
('Decoração de Eventos', 'decoracao-eventos', 'Decoração para festas', 'gift'),
('Buffet', 'buffet', 'Serviços de buffet e catering', 'utensils'),

-- Serviços Profissionais
('Contabilidade', 'contabilidade', 'Serviços contábeis', 'calculator'),
('Advocacia', 'advocacia', 'Serviços jurídicos', 'scale'),
('Design Gráfico', 'design-grafico', 'Criação de materiais gráficos', 'palette'),
('Marketing Digital', 'marketing-digital', 'Gestão de redes sociais e marketing', 'trending-up'),
('Tradução', 'traducao', 'Serviços de tradução de textos', 'languages'),

-- Serviços Automotivos
('Mecânica', 'mecanica', 'Reparos automotivos', 'wrench'),
('Estética Automotiva', 'estetica-automotiva', 'Lavagem e enceramento', 'car'),
('Chaveiro', 'chaveiro', 'Abertura de veículos e cópias', 'key'),

-- Outros Serviços
('Pet Care', 'pet-care', 'Cuidados com animais de estimação', 'heart'),
('Consultoria', 'consultoria', 'Serviços de consultoria empresarial', 'briefcase')

ON CONFLICT (slug) DO NOTHING;