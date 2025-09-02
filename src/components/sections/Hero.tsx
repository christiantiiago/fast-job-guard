import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Shield, Clock } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="hero-gradient text-white section-padding overflow-hidden relative">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-black/10"></div>
      
      <div className="container-center relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-balance">
                Encontre o{" "}
                <span className="bg-white/20 px-3 py-1 rounded-lg">
                  profissional ideal
                </span>{" "}
                em minutos
              </h1>
              <p className="text-xl text-white/90 leading-relaxed max-w-lg">
                Contrate serviços com segurança. Pagamento protegido até a conclusão do trabalho.
              </p>
            </div>

            {/* Search bar */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-5 w-5" />
                  <Input 
                    placeholder="Que serviço você precisa?"
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 h-12"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-5 w-5" />
                  <Input 
                    placeholder="Sua localização"
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 h-12"
                  />
                </div>
                <Button variant="hero" size="lg" className="h-12 px-8">
                  Buscar
                </Button>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-white/80" />
                <span className="text-white/90">Pagamento Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-white/80" />
                <span className="text-white/90">Entrega Garantida</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="cta" size="xl" className="flex-1 sm:flex-none">
                Publicar Trabalho
              </Button>
              <Button variant="outline" size="xl" className="flex-1 sm:flex-none bg-white/10 border-white/30 text-white hover:bg-white/20">
                Quero Trabalhar
              </Button>
            </div>
          </div>

          {/* Right image */}
          <div className="relative animate-fade-in">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={heroImage} 
                alt="Profissionais oferecendo serviços através do Job Fast"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            
            {/* Floating cards */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Pagamento Seguro</p>
                  <p className="text-muted-foreground text-xs">Proteção total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;