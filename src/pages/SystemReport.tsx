import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, Briefcase, Users, MessageCircle, Wallet, Star, 
  FileText, Search, Settings, Activity, BarChart, Crown,
  Home, Plus, HelpCircle, DollarSign, MapPin, Calendar,
  CheckCircle2, AlertCircle, Zap, Globe, Smartphone
} from 'lucide-react';

export default function SystemReport() {
  const systemFeatures = [
    {
      category: "Autenticação e Usuários",
      icon: Users,
      color: "bg-blue-500",
      features: [
        "Sistema de autenticação completo com Supabase",
        "3 tipos de usuário: Cliente, Prestador, Admin",
        "Perfis de usuário com avatares e informações",
        "Sistema de avaliações e rating",
        "KYC (Know Your Customer) com verificação por IA",
        "Verificação facial para admins",
        "Sistema de bloqueio e suspensão"
      ]
    },
    {
      category: "Trabalhos (Jobs)",
      icon: Briefcase,
      color: "bg-green-500",
      features: [
        "Criação e gerenciamento de trabalhos",
        "47 categorias de serviços disponíveis",
        "Sistema de orçamento (mín/máx)",
        "Localização com mapas interativos",
        "Upload de imagens para trabalhos",
        "Status: Rascunho, Aberto, Em Andamento, Concluído, Cancelado",
        "Sistema de prazos e agendamento",
        "Detalhes completos com endereço"
      ]
    },
    {
      category: "Propostas e Negociação",
      icon: MessageCircle,
      color: "bg-purple-500",
      features: [
        "Sistema de propostas dos prestadores",
        "Contra-ofertas entre clientes e prestadores",
        "Propostas diretas de clientes para prestadores",
        "Sistema de cooldown para evitar spam",
        "Aprovação automática de propostas",
        "Negociação de preços e prazos",
        "Histórico completo de propostas"
      ]
    },
    {
      category: "Pagamentos e Financeiro",
      icon: DollarSign,
      color: "bg-emerald-500",
      features: [
        "Integração com Stripe para pagamentos",
        "Sistema de escrow (pagamento em garantia)",
        "Liberação automática de pagamentos",
        "Cálculo automático de taxas da plataforma",
        "Taxas diferenciadas para usuários premium",
        "Relatórios financeiros para prestadores",
        "Sistema de saques e payouts"
      ]
    },
    {
      category: "Localização e Mapas",
      icon: MapPin,
      color: "bg-orange-500",
      features: [
        "Integração com Mapbox",
        "Geocodificação de endereços",
        "Busca por proximidade",
        "Visualização de trabalhos no mapa",
        "Áreas de serviço dos prestadores",
        "Cálculo de distâncias",
        "Marcadores personalizados"
      ]
    },
    {
      category: "Comunicação",
      icon: MessageCircle,
      color: "bg-cyan-500",
      features: [
        "Sistema de chat em tempo real",
        "Notificações push",
        "Centro de notificações",
        "Filtro de conteúdo inadequado",
        "Mensagens com anexos",
        "Notificações por email (planejado)",
        "Sistema de alertas para admins"
      ]
    },
    {
      category: "Administração",
      icon: Shield,
      color: "bg-red-500",
      features: [
        "Dashboard administrativo completo",
        "Gerenciamento de usuários",
        "Sistema KYC com análise por IA",
        "Detecção de fraudes",
        "Logs de auditoria",
        "Métricas e analytics",
        "Gerenciamento de disputas",
        "Configurações do sistema"
      ]
    },
    {
      category: "Premium",
      icon: Crown,
      color: "bg-yellow-500",
      features: [
        "Planos premium para usuários",
        "Taxas reduzidas (5% vs 7.5%)",
        "Prioridade em buscas",
        "Recursos adicionais",
        "Integração com Stripe para assinaturas",
        "Gerenciamento de cobrança"
      ]
    }
  ];

  const mobileMenus = [
    {
      userType: "Cliente",
      menus: [
        { name: "Início", icon: Home, route: "/dashboard" },
        { name: "Prestadores", icon: Search, route: "/providers/discover" },
        { name: "Trabalhos", icon: Briefcase, route: "/jobs" },
        { name: "Chat", icon: MessageCircle, route: "/chat" },
        { name: "Carteira", icon: Wallet, route: "/wallet" },
        { name: "Premium", icon: Crown, route: "/premium", condition: "não-premium" }
      ]
    },
    {
      userType: "Prestador",
      menus: [
        { name: "Início", icon: Home, route: "/dashboard" },
        { name: "Descobrir", icon: Search, route: "/discover" },
        { name: "Trabalhos", icon: Briefcase, route: "/jobs" },
        { name: "Chat", icon: MessageCircle, route: "/chat" },
        { name: "Carteira", icon: Wallet, route: "/provider/finance" },
        { name: "Premium", icon: Crown, route: "/premium", condition: "não-premium" }
      ]
    }
  ];

  const hamburgerMenus = {
    "Cliente": [
      "Início", "Trabalhos", "Descobrir Prestadores", "Carteira", 
      "Avaliações", "Documentos", "Perfil", "Notificações", "Tema", "Sair"
    ],
    "Prestador": [
      "Início", "Descobrir Trabalhos", "Meus Trabalhos", "Financeiro",
      "Avaliações", "Documentos", "Perfil", "Notificações", "Tema", "Sair"
    ],
    "Admin": [
      "Dashboard Admin", "Usuários", "KYC", "Atividades", "Pagamentos",
      "Configurações", "Todas as páginas de usuário", "Notificações", "Sair"
    ]
  };

  const technicalStack = [
    { name: "Frontend", tech: "React + TypeScript + Vite", icon: Globe },
    { name: "Styling", tech: "Tailwind CSS + Shadcn/UI", icon: Zap },
    { name: "Backend", tech: "Supabase (PostgreSQL + Edge Functions)", icon: Shield },
    { name: "Pagamentos", tech: "Stripe", icon: DollarSign },
    { name: "Mapas", tech: "Mapbox", icon: MapPin },
    { name: "Mobile", tech: "Capacitor (iOS/Android)", icon: Smartphone },
    { name: "IA", tech: "OpenAI GPT-4 para análise KYC", icon: Activity }
  ];

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold primary-gradient bg-clip-text text-transparent">
            Relatório Completo do Sistema
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Visão geral completa da plataforma Job Fast - funcionalidades, menus e arquitetura técnica
          </p>
        </div>

        {/* Stack Técnico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Stack Tecnológico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {technicalStack.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <item.icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.tech}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Funcionalidades do Sistema */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Funcionalidades Principais</h2>
          <div className="grid gap-6">
            {systemFeatures.map((category, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {category.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Menus Mobile */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Menus Mobile</h2>
          
          {/* Bottom Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>Navegação Inferior (Bottom Nav)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mobileMenus.map((userMenu, index) => (
                  <div key={index}>
                    <h4 className="font-semibold mb-3">{userMenu.userType}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {userMenu.menus.map((menu, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <menu.icon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{menu.name}</span>
                          {menu.condition && (
                            <Badge variant="outline" className="text-xs">
                              {menu.condition}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hamburger Menu */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Hamburger (Lateral)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(hamburgerMenus).map(([userType, menus], index) => (
                  <div key={index}>
                    <h4 className="font-semibold mb-2">{userType}</h4>
                    <div className="flex flex-wrap gap-2">
                      {menus.map((menu, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {menu}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Páginas Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Páginas Principais do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Dashboard", "Trabalhos", "Descobrir", "Chat", "Perfil", "Carteira",
                "KYC/Documentos", "Avaliações", "Contratos", "Premium", "Ajuda",
                "Admin Dashboard", "Admin Usuários", "Admin KYC", "Admin Analytics",
                "Admin Atividades", "Admin Disputas", "Admin Pagamentos", "Admin Configurações",
                "Financeiro Prestador", "Descobrir Prestadores", "Detalhes do Trabalho",
                "Propostas", "Checkout", "Login", "Registro"
              ].map((page, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">{page}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-blue-600">47</div>
                <div className="text-sm text-muted-foreground">Categorias de Serviços</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-green-600">25+</div>
                <div className="text-sm text-muted-foreground">Páginas Funcionais</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-purple-600">3</div>
                <div className="text-sm text-muted-foreground">Tipos de Usuário</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-orange-600">7</div>
                <div className="text-sm text-muted-foreground">Integrações Externas</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Melhorias Implementadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Melhorias Recém Implementadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Notificações no Mobile e Desktop</p>
                  <p className="text-sm text-muted-foreground">
                    Adicionadas ao lado do chat tanto no mobile header quanto no sidebar desktop
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Página de Detalhes do Trabalho Melhorada</p>
                  <p className="text-sm text-muted-foreground">
                    Nome do prestador aparece nas propostas com link para o perfil
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">47 Categorias de Trabalho</p>
                  <p className="text-sm text-muted-foreground">
                    Expandido de 8 para 47 categorias cobrindo todos os tipos de serviço
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}