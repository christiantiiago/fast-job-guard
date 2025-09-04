import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  ArrowRight, 
  Shield, 
  Smartphone, 
  TrendingUp,
  Users,
  Zap,
  Award
} from 'lucide-react';

const newsItems = [
  {
    id: 1,
    category: 'Segurança',
    title: 'Nova Autenticação Facial Implementada',
    description: 'Sistema de reconhecimento facial garante ainda mais segurança para prestadores e clientes na plataforma.',
    date: '2025-01-15',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    featured: true
  },
  {
    id: 2,
    category: 'Produto',
    title: 'App Mobile Redesenhado',
    description: 'Nova interface mais intuitiva e responsiva para melhor experiência em dispositivos móveis.',
    date: '2025-01-10',
    icon: Smartphone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 3,
    category: 'Crescimento',
    title: 'Marca de 10 Mil Usuários Atingida',
    description: 'Celebramos o crescimento exponencial da nossa comunidade de prestadores e clientes.',
    date: '2025-01-05',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 4,
    category: 'Comunidade',
    title: 'Programa de Parceiros Lançado',
    description: 'Novo programa oferece benefícios exclusivos para prestadores mais ativos na plataforma.',
    date: '2024-12-28',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 5,
    category: 'Performance',
    title: 'Otimizações de Velocidade',
    description: 'Melhorias significativas na velocidade de carregamento e navegação da plataforma.',
    date: '2024-12-20',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    id: 6,
    category: 'Reconhecimento',
    title: 'Prêmio de Melhor Startup do Ano',
    description: 'Fomos reconhecidos como a melhor startup de tecnologia para serviços domésticos de 2024.',
    date: '2024-12-15',
    icon: Award,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

export default function NewsSection() {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const featuredNews = newsItems.filter(item => item.featured)[0];
  const regularNews = newsItems.filter(item => !item.featured).slice(0, 4);

  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Novidades da Plataforma
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Últimas Atualizações
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Fique por dentro das últimas novidades, melhorias e conquistas da nossa plataforma.
            Estamos sempre evoluindo para oferecer a melhor experiência.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Featured News */}
          {featuredNews && (
            <div className="lg:col-span-2">
              <Card className="group hover:shadow-xl transition-all duration-500 border-primary/20 overflow-hidden">
                <div className={`h-2 ${featuredNews.bgColor.replace('50', '200')}`}></div>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      DESTAQUE
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {featuredNews.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {featuredNews.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {featuredNews.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(featuredNews.date)}
                    </div>
                    <div className={`${featuredNews.bgColor} p-2 rounded-lg`}>
                      <featuredNews.icon className={`h-5 w-5 ${featuredNews.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Regular News List */}
          <div className="space-y-6">
            {regularNews.map((item) => (
              <Card key={item.id} className="group hover:shadow-md transition-all duration-300 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`${item.bgColor} p-2 rounded-lg flex-shrink-0`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* See More Button */}
            <Button variant="outline" className="w-full group">
              Ver Todas as Novidades
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Newsletter Signup */}
        <Card className="mt-12 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">
              Não Perca Nenhuma Novidade
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Receba atualizações sobre novas funcionalidades, melhorias e oportunidades 
              diretamente no seu email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Seu email"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
              />
              <Button>
                Inscrever-se
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}