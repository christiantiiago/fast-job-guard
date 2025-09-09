import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, EyeOff, ArrowLeft, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const { user, userRole, signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);

  // Security: Block after 3 failed attempts
  useEffect(() => {
    if (attemptCount >= 3) {
      setIsBlocked(true);
      setBlockTimeLeft(300); // 5 minutes
      
      const timer = setInterval(() => {
        setBlockTimeLeft((prev) => {
          if (prev <= 1) {
            setIsBlocked(false);
            setAttemptCount(0);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [attemptCount]);

  // Verificar se o usuário logado tem permissão de admin
  useEffect(() => {
    if (user && !loading && userRole && userRole !== 'admin') {
      toast.error('🚫 Acesso Negado', {
        description: 'Esta conta não tem permissões administrativas.',
        duration: 5000,
      });
      signOut();
    } else if (user && !loading && userRole === 'admin') {
      toast.success('Acesso administrativo autorizado!', {
        description: 'Bem-vindo ao painel de administração'
      });
      navigate('/admin');
    }
  }, [user, userRole, loading, signOut, navigate]);

  // Redirect if already logged in as admin
  if (user && !loading && userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Redirect if logged in as non-admin
  if (user && !loading && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast.error('Muitas tentativas falhas', {
        description: `Tente novamente em ${Math.ceil(blockTimeLeft / 60)} minutos`
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setAttemptCount(prev => prev + 1);
        setError(error.message);
        
        const remainingAttempts = 3 - (attemptCount + 1);
        if (remainingAttempts > 0) {
          toast.error('Credenciais inválidas', {
            description: `${remainingAttempts} tentativa(s) restante(s)`
          });
        } else {
          toast.error('Conta temporariamente bloqueada', {
            description: 'Muitas tentativas falhas. Tente novamente em 5 minutos.'
          });
        }
      } else {
        // Login bem-sucedido - aguardar o hook atualizar e verificar permissões
        setAttemptCount(0);
        toast.success('Login realizado!', {
          description: 'Verificando permissões...'
        });
        
        // Aguardar o hook useAuth atualizar o userRole
        setTimeout(() => {
          // A verificação será feita no useEffect que monitora userRole
        }, 1000);
      }
    } catch (err) {
      setError('Erro interno. Tente novamente.');
      toast.error('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Back Button */}
        <div className="flex justify-start">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-destructive/10 border-2 border-destructive/20 rounded-2xl flex items-center justify-center mb-4 relative">
            <Shield className="h-8 w-8 text-destructive" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
              <Lock className="h-2 w-2 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Administrativo</h1>
          <p className="text-muted-foreground mt-2">
            Área restrita para administradores do sistema
          </p>
          <Badge variant="destructive" className="mt-2">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Nível de Segurança Máximo
          </Badge>
        </div>

        {/* Admin Login Form */}
        <Card className="card-modern border-destructive/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Login de Administrador
            </CardTitle>
            <CardDescription>
              Credenciais de administrador necessárias
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isBlocked && (
                <Alert variant="destructive">
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Conta Bloqueada:</strong> Muitas tentativas falhas. 
                    Tente novamente em {formatTime(blockTimeLeft)}.
                  </AlertDescription>
                </Alert>
              )}

              {!isBlocked && attemptCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atenção:</strong> {3 - attemptCount} tentativa(s) restante(s) antes do bloqueio.
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="border-amber-200 bg-amber-50">
                <Shield className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Área Restrita:</strong> Somente administradores autorizados. 
                  Todas as tentativas de acesso são registradas e monitoradas.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail do Administrador</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@jobfast.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha de administrador"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-destructive hover:bg-destructive/90" 
                disabled={isLoading || isBlocked}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando credenciais...
                  </>
                ) : isBlocked ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Bloqueado ({formatTime(blockTimeLeft)})
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Acessar Painel Admin
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Problemas de acesso?{' '}
                <Link 
                  to="/contact" 
                  className="text-primary hover:underline font-medium"
                >
                  Contate o suporte técnico
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Notice */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>Conexão segura SSL/TLS</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 text-blue-500" />
            <span>Todas as ações são registradas e auditadas</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3 text-destructive" />
            <span>Monitoramento de segurança ativo</span>
          </div>
        </div>

        {/* Admin Credentials Helper (remover em produção) */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-4">
            <div className="text-center text-xs text-muted-foreground">
              <p className="font-medium mb-2">💡 Para desenvolvimento:</p>
              <p>Crie um usuário admin através do SQL no Supabase:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-2">
                INSERT INTO user_roles (user_id, role) VALUES ('seu-user-id', 'admin');
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}