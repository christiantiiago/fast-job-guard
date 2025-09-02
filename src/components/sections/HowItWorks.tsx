import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Users, CreditCard, CheckCircle } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Publique seu Trabalho",
    description: "Descreva o que precisa, adicione fotos e defina seu orçamento. É rápido e fácil.",
    icon: Search,
    color: "text-primary"
  },
  {
    id: 2,
    title: "Receba Propostas",
    description: "Profissionais qualificados enviam propostas com preços e prazos personalizados.",
    icon: Users,
    color: "text-secondary"
  },
  {
    id: 3,
    title: "Pague com Segurança",
    description: "Seu dinheiro fica protegido até você aprovar a entrega final do trabalho.",
    icon: CreditCard,
    color: "text-accent"
  },
  {
    id: 4,
    title: "Aprove e Avalie",
    description: "Confirme a conclusão, libere o pagamento e avalie o profissional.",
    icon: CheckCircle,
    color: "text-secondary"
  }
];

const HowItWorks = () => {
  return (
    <section className="section-padding">
      <div className="container-center">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Como Funciona o Job Fast
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um processo simples e seguro para conectar você ao profissional ideal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div 
                key={step.id} 
                className="relative animate-scale-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <Card className="h-full border-0 card-gradient hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-md">
                        <IconComponent className={`h-8 w-8 ${step.color}`} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                        {step.id}
                      </div>
                    </div>
                    <h3 className="font-semibold text-xl text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/30 to-transparent transform -translate-y-1/2"></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center animate-fade-in">
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Pronto para Começar?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Junte-se aos milhares de clientes satisfeitos que já encontraram o profissional ideal
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="shipfy" size="xl">
                Publicar Trabalho Agora
              </Button>
              <Button variant="outline" size="xl">
                Quero ser Profissional
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;