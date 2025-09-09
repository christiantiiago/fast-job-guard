import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  HelpCircle, 
  Shield, 
  CreditCard,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const faqData = [
  {
    category: "Pagamentos",
    icon: CreditCard,
    questions: [
      {
        question: "Como funciona o sistema de pagamento em escrow?",
        answer: "O valor fica retido na plataforma até a conclusão do serviço. O prestador só recebe após 7 dias ou quando você confirmar a conclusão."
      },
      {
        question: "Posso cancelar um pagamento?",
        answer: "Sim, você pode cancelar antes do prestador iniciar o trabalho. Após o início, será necessário abrir uma disputa."
      },
      {
        question: "Quais são as taxas da plataforma?",
        answer: "Clientes pagam 7,5% (5% no Premium) e prestadores pagam 5% (3,5% no Premium) sobre o valor do serviço."
      }
    ]
  },
  {
    category: "Segurança",
    icon: Shield,
    questions: [
      {
        question: "Como funciona a verificação KYC?",
        answer: "Todos os usuários precisam enviar documentos (RG, selfie, comprovante de endereço). Prestadores também enviam antecedentes criminais."
      },
      {
        question: "O que fazer se suspeitar de fraude?",
        answer: "Entre em contato imediatamente conosco. Temos sistemas de IA para detectar atividades suspeitas."
      },
      {
        question: "Meus dados estão seguros?",
        answer: "Sim, usamos criptografia de ponta a ponta e cumprimos todas as normas da LGPD."
      }
    ]
  },
  {
    category: "Contratos",
    icon: FileText,
    questions: [
      {
        question: "Como funciona o contrato automático?",
        answer: "Quando uma proposta é aceita, geramos automaticamente um contrato com todos os detalhes acordados."
      },
      {
        question: "Posso modificar um contrato?",
        answer: "Após assinado, modificações precisam do acordo de ambas as partes ou mediação da plataforma."
      },
      {
        question: "O contrato tem validade jurídica?",
        answer: "Sim, nossos contratos seguem as normas do Código Civil brasileiro e são juridicamente válidos."
      }
    ]
  },
  {
    category: "Usuários",
    icon: Users,
    questions: [
      {
        question: "Como encontrar prestadores confiáveis?",
        answer: "Use os filtros de avaliação, verifique o selo de verificação KYC e leia os comentários de outros clientes."
      },
      {
        question: "Posso ser cliente e prestador ao mesmo tempo?",
        answer: "Sim, você pode alternar entre os perfis na plataforma conforme necessário."
      },
      {
        question: "Como melhorar minha avaliação?",
        answer: "Seja pontual, educado, entregue com qualidade e mantenha boa comunicação."
      }
    ]
  }
];

export default function HelpSupport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const { toast } = useToast();

  const filteredFAQ = faqData.filter(category => {
    if (selectedCategory && category.category !== selectedCategory) return false;
    if (searchTerm) {
      return category.questions.some(q => 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Mensagem Enviada!",
      description: "Retornaremos em até 24 horas.",
    });
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Central de Ajuda e Suporte</h1>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas ou entre em contato conosco
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Chat ao Vivo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Segunda a Sexta, 8h às 18h
                </p>
                <Button className="w-full">Iniciar Chat</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">E-mail</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  suporte@jobfast.com.br
                </p>
                <Button variant="outline" className="w-full">Enviar E-mail</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Telefone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  (11) 4000-0000
                </p>
                <Button variant="outline" className="w-full">Ligar Agora</Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* FAQ Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Perguntas Frequentes
                  </CardTitle>
                  <CardDescription>
                    Encontre respostas para as dúvidas mais comuns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search */}
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nas perguntas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Category Filters */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedCategory === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                    >
                      Todas
                    </Button>
                    {faqData.map((category) => (
                      <Button
                        key={category.category}
                        variant={selectedCategory === category.category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.category)}
                      >
                        {category.category}
                      </Button>
                    ))}
                  </div>

                  {/* FAQ Items */}
                  <div className="space-y-6">
                    {filteredFAQ.map((category) => (
                      <div key={category.category}>
                        <div className="flex items-center gap-2 mb-4">
                          <category.icon className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{category.category}</h3>
                          <Badge variant="secondary">{category.questions.length}</Badge>
                        </div>
                        <div className="space-y-4">
                          {category.questions.map((item, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">{item.question}</h4>
                              <p className="text-sm text-muted-foreground">{item.answer}</p>
                            </div>
                          ))}
                        </div>
                        {filteredFAQ.length > 1 && <Separator className="mt-6" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Entre em Contato</CardTitle>
                  <CardDescription>
                    Não encontrou sua resposta? Envie sua dúvida
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Nome</label>
                        <Input
                          value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">E-mail</label>
                        <Input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assunto</label>
                      <Input
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mensagem</label>
                      <Textarea
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Enviar Mensagem
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Status Page */}
              <Card>
                <CardHeader>
                  <CardTitle>Status da Plataforma</CardTitle>
                  <CardDescription>
                    Verificar o status dos nossos serviços
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">API Principal</span>
                    </div>
                    <Badge className="bg-green-500">Operacional</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Pagamentos</span>
                    </div>
                    <Badge className="bg-green-500">Operacional</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Notificações</span>
                    </div>
                    <Badge className="bg-yellow-500">Lentidão</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Emergência
                  </CardTitle>
                  <CardDescription>
                    Para situações urgentes de segurança
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    Se você identificou uma situação de risco ou fraude, entre em contato imediatamente:
                  </p>
                  <div className="space-y-2">
                    <Button variant="destructive" className="w-full">
                      <Phone className="mr-2 h-4 w-4" />
                      Ligar: (11) 9999-0000
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      emergencia@jobfast.com.br
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}