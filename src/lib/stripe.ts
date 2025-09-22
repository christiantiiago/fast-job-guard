// Stripe configuration
export const STRIPE_PUBLISHABLE_KEY = "pk_live_51RN5AdGHAEKUTVoAtHmgTx9EoWGg8dIFr4HbmZcNWkjGg9FpPWMHa1AQ97iNJ08HlOxmbwuq1WqucCmbx0nA5aOF00fM2YPdUi";

// Boost options configuration
export const BOOST_OPTIONS = [
  {
    id: 'express',
    title: 'Express',
    duration: '5 horas',
    price: 19.99,
    description: 'Boost rápido para resultados imediatos',
    features: ['Destaque por 5 horas', 'Posição no topo', 'Badge "Urgente"']
  },
  {
    id: 'turbo',
    title: 'Turbo',
    duration: '2 dias',
    price: 23.99,
    description: 'Máxima visibilidade por 48 horas',
    features: ['Destaque por 2 dias', 'Posição premium', 'Badge "Popular"', 'Notificação push'],
    popular: true
  },
  {
    id: 'premium',
    title: 'Premium',
    duration: '1 semana',
    price: 39.99,
    description: 'Visibilidade garantida por uma semana',
    features: ['Destaque por 7 dias', 'Posição VIP', 'Badge "Premium"', 'Analytics detalhado']
  },
  {
    id: 'platinum',
    title: 'Platinum',
    duration: '2 semanas',
    price: 59.99,
    description: 'Máximo alcance por 14 dias',
    features: ['Destaque por 14 dias', 'Posição destaque', 'Badge "Platinum"', 'Suporte prioritário']
  },
  {
    id: 'diamond',
    title: 'Diamond',
    duration: '1 mês',
    price: 89.99,
    description: 'Visibilidade máxima por 30 dias',
    features: ['Destaque por 30 dias', 'Posição exclusiva', 'Badge "Diamond"', 'Relatórios avançados'],
    premium: true
  },
  {
    id: 'ultimate',
    title: 'Ultimate',
    duration: '3 meses',
    price: 199.99,
    description: 'O mais completo por 90 dias',
    features: ['Destaque por 90 dias', 'Posição ultra premium', 'Badge "Ultimate"', 'Gerente dedicado'],
    premium: true
  }
];