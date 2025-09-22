import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  DollarSign,
  Camera,
  UserX,
  FileText,
  Star,
  Users,
  Lock,
  Info,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlatformRules() {
  const rules = [
    {
      category: 'Comportamento e Conduta',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      rules: [
        {
          title: 'Seja sempre respeitoso e profissional',
          description: 'Trate clientes e outros prestadores com cortesia. Evite linguagem ofensiva, discriminatória ou inadequada.',
          severity: 'high',
          consequence: 'Advertência ou suspensão temporária'
        },
        {
          title: 'Mantenha comunicação clara e honesta',
          description: 'Seja transparente sobre suas habilidades, disponibilidade e prazos. Não prometa algo que não pode cumprir.',
          severity: 'medium',
          consequence: 'Advertência'
        },
        {
          title: 'Não solicite contato fora da plataforma',
          description: 'Toda comunicação deve ocorrer através do chat interno da plataforma para segurança de todos.',
          severity: 'high',
          consequence: 'Suspensão ou banimento'
        }
      ]
    },
    {
      category: 'Qualidade do Serviço',
      icon: Star,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      rules: [
        {
          title: 'Cumpra prazos acordados',
          description: 'Entregue o trabalho na data combinada. Se houver imprevistos, comunique o cliente com antecedência.',
          severity: 'high',
          consequence: 'Impacto na avaliação e possível advertência'
        },
        {
          title: 'Entregue trabalho de qualidade',
          description: 'O serviço deve atender às especificações acordadas e ter qualidade profissional.',
          severity: 'medium',
          consequence: 'Avaliação negativa e possível disputa'
        },
        {
          title: 'Seja responsivo às mensagens',
          description: 'Responda mensagens dos clientes em até 24 horas, especialmente durante trabalhos ativos.',
          severity: 'medium',
          consequence: 'Advertência'
        }
      ]
    },
    {
      category: 'Propostas e Negociações',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      rules: [
        {
          title: 'Respeite os limites de propostas',
          description: 'Plano gratuito: máximo 10 propostas por mês. Premium: ilimitado.',
          severity: 'medium',
          consequence: 'Bloqueio temporário de novas propostas'
        },
        {
          title: 'Não faça propostas irreais ou spam',
          description: 'Evite propostas com valores extremamente baixos apenas para ganhar o trabalho ou enviar muitas propostas iguais.',
          severity: 'medium',
          consequence: 'Advertência ou suspensão de propostas'
        },
        {
          title: 'Honre acordos firmados',
          description: 'Após aceitar um trabalho, cumpra o combinado. Cancelamentos frequentes prejudicam sua reputação.',
          severity: 'high',
          consequence: 'Advertência e impacto na avaliação'
        }
      ]
    },
    {
      category: 'Documentação e Verificação',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      rules: [
        {
          title: 'Mantenha documentos atualizados',
          description: 'Seus documentos de KYC devem estar válidos e atualizados. Comunique mudanças importantes.',
          severity: 'high',
          consequence: 'Suspensão até regularização'
        },
        {
          title: 'Não compartilhe documentos de terceiros',
          description: 'Use apenas seus próprios documentos. Documentos fraudulentos resultam em banimento imediato.',
          severity: 'critical',
          consequence: 'Banimento permanente'
        },
        {
          title: 'Complete a verificação facial quando solicitado',
          description: 'Para ações sensíveis, você pode precisar confirmar identidade via reconhecimento facial.',
          severity: 'medium',
          consequence: 'Bloqueio de funcionalidades até verificação'
        }
      ]
    },
    {
      category: 'Pagamentos e Financeiro',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      rules: [
        {
          title: 'Não tente burlar o sistema de pagamentos',
          description: 'Todos os pagamentos devem ser processados através da plataforma para segurança e garantia.',
          severity: 'critical',
          consequence: 'Banimento e possível ação legal'
        },
        {
          title: 'Respeite o período de segurança',
          description: 'Pagamentos ficam em escrow por 7 dias para garantir qualidade. Não pressione por liberação antecipada.',
          severity: 'medium',
          consequence: 'Advertência'
        },
        {
          title: 'Use dados bancários corretos',
          description: 'Verifique seus dados antes de solicitar saques. Erros podem atrasar ou impedir transferências.',
          severity: 'low',
          consequence: 'Atraso no saque'
        }
      ]
    }
  ];

  const consequences = [
    { level: 'Advertência', description: 'Notificação oficial. 3 advertências = suspensão temporária', color: 'text-yellow-600' },
    { level: 'Suspensão Temporária', description: '7 a 30 dias sem acesso à plataforma', color: 'text-orange-600' },
    { level: 'Suspensão Definitiva', description: 'Perda permanente do acesso à conta', color: 'text-red-600' },
    { level: 'Banimento', description: 'Proibição permanente, incluindo criação de novas contas', color: 'text-red-800' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return severity;
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Regras da Plataforma</h1>
          <p className="text-muted-foreground">
            Siga essas diretrizes para manter sua conta ativa e ter sucesso na plataforma
          </p>
        </div>

        {/* Alert */}
        <Alert className="border-accent/20 bg-accent/5">
          <Info className="h-4 w-4 text-accent" />
          <AlertDescription className="text-accent">
            <strong>Importante:</strong> O não cumprimento dessas regras pode resultar em advertências, 
            suspensões ou banimento da plataforma. Leia com atenção e mantenha-se sempre atualizado.
          </AlertDescription>
        </Alert>

        {/* Rules by Category */}
        <div className="space-y-6">
          {rules.map((category, categoryIndex) => {
            const IconComponent = category.icon;
            
            return (
              <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <IconComponent className={`h-5 w-5 ${category.color}`} />
                    </div>
                    {category.category}
                  </CardTitle>
                  <CardDescription>
                    Regras específicas para esta categoria de conduta
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {category.rules.map((rule, ruleIndex) => (
                      <div key={ruleIndex} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{rule.title}</h4>
                          <Badge className={getSeverityColor(rule.severity)}>
                            {getSeverityLabel(rule.severity)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {rule.description}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          <span className="text-destructive font-medium">
                            Consequência: {rule.consequence}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Consequences System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Sistema de Consequências
            </CardTitle>
            <CardDescription>
              Entenda como funciona o sistema progressivo de punições
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {consequences.map((consequence, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <Badge variant="outline" className={consequence.color}>
                    {index + 1}
                  </Badge>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{consequence.level}</h4>
                    <p className="text-sm text-muted-foreground">{consequence.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Dica:</strong> Mantenha sempre um comportamento profissional e cumpra 
                os acordos firmados. Prestadores com boa reputação têm prioridade nos resultados 
                de busca e mais oportunidades de trabalho.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Help and Support */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Precisa de Ajuda?</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Se você tem dúvidas sobre as regras ou precisa reportar algo, entre em contato conosco.
            </p>
            
            <div className="flex gap-2">
              <Link to="/help-support">
                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">
                  <ExternalLink className="h-3 w-3" />
                  Central de Ajuda
                </Badge>
              </Link>
              
              <Link to="/profile">
                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">
                  <Shield className="h-3 w-3" />
                  Configurações de Segurança
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}