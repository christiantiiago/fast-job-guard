import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Search,
  Bell,
  Zap,
  Shield,
  CreditCard,
  Users,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertCircle,
  Info,
  Star,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'feature' | 'improvement' | 'fix' | 'announcement';
  date: string;
  isNew?: boolean;
  tags: string[];
}

export default function NewsPage() {
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Mock data - in real implementation, this would come from a backend
  const newsItems: NewsItem[] = [
    {
      id: '1',
      title: '🎉 Sistema Premium Lançado!',
      description: 'Novas funcionalidades exclusivas para prestadores premium',
      content: 'Agora oferecemos planos premium com benefícios exclusivos: propostas ilimitadas, taxas reduzidas para 5%, 3 saques gratuitos por mês, destaque na busca e metas personalizadas.',
      type: 'feature',
      date: '2024-01-15',
      isNew: true,
      tags: ['premium', 'taxas', 'saques']
    },
    {
      id: '2', 
      title: '💰 Repasse Semanal Implementado',
      description: 'Saques automáticos toda quinta-feira sem taxa',
      content: 'Implementamos o sistema de repasse semanal. Todo dinheiro que não for sacado durante a semana será automaticamente transferido toda quinta-feira sem cobrança de taxa.',
      type: 'feature',
      date: '2024-01-10',
      tags: ['repasse', 'saque', 'quinta-feira']
    },
    {
      id: '3',
      title: '🛡️ Guia "Como Evitar Bloqueios"',
      description: 'Novas diretrizes para manter sua conta segura',
      content: 'Criamos um guia completo com todas as regras da plataforma. Siga essas diretrizes para evitar advertências e bloqueios: seja educado, cumpra prazos, mantenha comunicação transparente.',
      type: 'announcement',
      date: '2024-01-08',
      tags: ['segurança', 'regras', 'bloqueio']
    },
    {
      id: '4',
      title: '🔧 Melhorias no Mapa de Descoberta',
      description: 'Interface otimizada para melhor experiência',
      content: 'O mapa da página "Descobrir Trabalhos" agora ocupa a tela inteira e possui melhor responsividade em dispositivos móveis. Navegação mais fluida e carregamento mais rápido.',
      type: 'improvement',
      date: '2024-01-05',
      tags: ['mapa', 'ui', 'mobile']
    },
    {
      id: '5',
      title: '🤖 IA Integrada para Análise de Jobs',
      description: 'Análise inteligente de trabalhos em tempo real',
      content: 'Nova funcionalidade de "Análise Rápida" utiliza inteligência artificial para avaliar a viabilidade e riscos de cada trabalho, ajudando você a tomar decisões mais informadas.',
      type: 'feature',
      date: '2024-01-03',
      tags: ['ia', 'análise', 'jobs']
    },
    {
      id: '6',
      title: '📱 App Mobile em Desenvolvimento',
      description: 'Aplicativo nativo para iOS e Android em breve',
      content: 'Estamos desenvolvendo o aplicativo mobile da Job Fast. Em breve você poderá gerenciar seus trabalhos, receber notificações push e muito mais diretamente do seu celular.',
      type: 'announcement',
      date: '2024-01-01',
      tags: ['mobile', 'app', 'notificações']
    },
    {
      id: '7',
      title: '🔄 Sistema de Contraofertas',
      description: 'Negociação mais flexível entre clientes e prestadores',
      content: 'Implementamos o sistema de contraofertas que permite negociação de preços e prazos de forma mais dinâmica. Agora você pode ajustar propostas conforme necessário.',
      type: 'feature',
      date: '2023-12-28',
      tags: ['negociação', 'propostas', 'contraofertas']
    },
    {
      id: '8',
      title: '🏦 Integração com Mais Bancos',
      description: 'Suporte expandido para PIX e transferências',
      content: 'Adicionamos suporte para mais instituições financeiras e melhoramos o sistema de PIX para saques mais rápidos e seguros.',
      type: 'improvement',
      date: '2023-12-25',
      tags: ['pix', 'bancos', 'saques']
    }
  ];

  const typeConfig = {
    feature: { label: 'Nova Funcionalidade', icon: Star, color: 'bg-blue-100 text-blue-800' },
    improvement: { label: 'Melhoria', icon: Zap, color: 'bg-green-100 text-green-800' },
    fix: { label: 'Correção', icon: CheckCircle2, color: 'bg-yellow-100 text-yellow-800' },
    announcement: { label: 'Anúncio', icon: Bell, color: 'bg-purple-100 text-purple-800' }
  };

  const filteredNews = newsItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || item.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Novidades da Plataforma</h1>
            <p className="text-muted-foreground">
              Fique por dentro de todas as atualizações e melhorias
            </p>
          </div>
          
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Bell className="h-3 w-3 mr-1" />
            {newsItems.filter(n => n.isNew).length} novas
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar novidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('all')}
            >
              Todas
            </Button>
            {Object.entries(typeConfig).map(([type, config]) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="gap-1"
              >
                <config.icon className="h-3 w-3" />
                {config.label}
              </Button>
            ))}
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {filteredNews.length > 0 ? (
            filteredNews.map((item) => {
              const config = typeConfig[item.type];
              const IconComponent = config.icon;
              
              return (
                <Card key={item.id} className={`${item.isNew ? 'border-primary/30 bg-primary/5' : ''} hover:shadow-md transition-shadow`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          {item.isNew && (
                            <Badge variant="default" className="bg-accent/10 text-accent border-accent/20">
                              NOVO
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-3">{item.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <Badge className={config.color}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="prose prose-sm max-w-none mb-4">
                      <p>{item.content}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      
                      {(item.type === 'feature' || item.type === 'improvement') && (
                        <Button variant="ghost" size="sm" className="gap-1">
                          <span>Ver mais</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Nenhuma novidade encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou o termo de busca.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Info */}
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <h4 className="font-medium text-accent mb-1">Mantenha-se Atualizado</h4>
                <p className="text-sm text-muted-foreground">
                  Esta página é atualizada sempre que lançamos novas funcionalidades ou melhorias. 
                  Recomendamos verificar regularmente para não perder nenhuma novidade importante.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}