import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, User, Briefcase } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container-center">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 primary-gradient rounded-2xl flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Job Fast</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs bg-primary/10 text-primary border-primary/20">
              Beta
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Como Funciona
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Categorias
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Para Profissionais
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Suporte
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hover:bg-primary/5 hover:text-primary">
              <User className="h-4 w-4 mr-2" />
              Entrar
            </Button>
            <Button variant="shipfy" size="sm">
              Publicar Trabalho
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm animate-slide-up">
            <nav className="flex flex-col gap-4 p-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Como Funciona
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Categorias
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Para Profissionais
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Suporte
              </a>
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button variant="ghost" className="justify-start hover:bg-primary/5 hover:text-primary">
                  <User className="h-4 w-4 mr-2" />
                  Entrar
                </Button>
                <Button variant="shipfy">
                  Publicar Trabalho
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;