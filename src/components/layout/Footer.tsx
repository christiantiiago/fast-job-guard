import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Briefcase, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin 
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container-center">
        {/* Main Footer Content */}
        <div className="section-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Job Fast</span>
              </div>
              <p className="text-background/80 leading-relaxed">
                A plataforma mais confiável para contratar serviços profissionais 
                com pagamento seguro e garantia de qualidade.
              </p>
              <div className="flex gap-3">
                <Button size="icon" variant="ghost" className="text-background/60 hover:text-background">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-background/60 hover:text-background">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-background/60 hover:text-background">
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-background/60 hover:text-background">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Serviços</h3>
              <ul className="space-y-2 text-background/80">
                <li><a href="#" className="hover:text-background transition-colors">Elétrica</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Hidráulica</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Pintura</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Limpeza</a></li>
                <li><a href="#" className="hover:text-background transition-colors">TI & Suporte</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Ver Todos</a></li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Empresa</h3>
              <ul className="space-y-2 text-background/80">
                <li><a href="#" className="hover:text-background transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Para Profissionais</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Trabalhe Conosco</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Newsletter</h3>
              <p className="text-background/80 text-sm">
                Receba dicas, novidades e ofertas especiais diretamente no seu e-mail.
              </p>
              <div className="space-y-3">
                <Input 
                  placeholder="Seu e-mail"
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/60"
                />
                <Button variant="secondary" size="sm" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Inscrever-se
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-background/20" />

          {/* Contact Info */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-background/80">
              <Phone className="h-4 w-4" />
              <span>(11) 4002-8922</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-background/80">
              <Mail className="h-4 w-4" />
              <span>contato@jobfast.com.br</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-background/80">
              <MapPin className="h-4 w-4" />
              <span>São Paulo, SP - Brasil</span>
            </div>
          </div>

          <Separator className="bg-background/20" />
        </div>

        {/* Bottom Footer */}
        <div className="pb-6 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/60">
            <p>© 2024 Job Fast. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-background transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-background transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-background transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;