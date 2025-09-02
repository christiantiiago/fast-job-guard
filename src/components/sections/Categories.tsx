import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Zap, 
  Wrench, 
  Scissors, 
  Paintbrush, 
  Laptop, 
  Camera, 
  Home,
  Car
} from "lucide-react";

const categories = [
  {
    id: 1,
    name: "Elétrica",
    icon: Zap,
    count: 234,
    description: "Instalações e reparos elétricos"
  },
  {
    id: 2,
    name: "Hidráulica",
    icon: Wrench,
    count: 189,
    description: "Encanamento e sistemas hidráulicos"
  },
  {
    id: 3,
    name: "Beleza",
    icon: Scissors,
    count: 456,
    description: "Cabeleireiro, manicure e estética"
  },
  {
    id: 4,
    name: "Pintura",
    icon: Paintbrush,
    count: 167,
    description: "Pintura residencial e comercial"
  },
  {
    id: 5,
    name: "TI & Suporte",
    icon: Laptop,
    count: 203,
    description: "Tecnologia e suporte técnico"
  },
  {
    id: 6,
    name: "Fotografia",
    icon: Camera,
    count: 145,
    description: "Eventos, produtos e retratos"
  },
  {
    id: 7,
    name: "Limpeza",
    icon: Home,
    count: 298,
    description: "Limpeza residencial e comercial"
  },
  {
    id: 8,
    name: "Automotivo",
    icon: Car,
    count: 134,
    description: "Mecânica e estética automotiva"
  }
];

const Categories = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-center">
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Explore Categorias Populares
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Encontre profissionais qualificados em diversas áreas de serviço
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id} 
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 border-0 card-gradient animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {category.description}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {category.count} profissionais
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center animate-fade-in">
          <Button variant="outline" size="lg">
            Ver Todas as Categorias
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Categories;