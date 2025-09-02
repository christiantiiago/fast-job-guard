import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const { user, userRole, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    setIsLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        toast.error('Erro ao fazer login', {
          description: error.message
        });
      } else {
        // Check if user is admin after successful login
        // The auth hook will automatically update userRole
        toast.success('Login de administrador realizado com sucesso!');
      }
    } catch (err) {
      setError('Erro interno. Tente novamente.');
      toast.error('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
          <div className="w-16 h-16 bg-destructive/10 border-2 border-destructive/20 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Administrativo</h1>
          <p className="text-muted-foreground mt-2">
            Área restrita para administradores do sistema
          </p>
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
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert className="border-amber-200 bg-amber-50">
                <Shield className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Atenção:</strong> Esta área é exclusiva para administradores. 
                  Acesso não autorizado é proibido.
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
                disabled={isLoading}
              >
                {isLoading ? 'Verificando credenciais...' : 'Acessar Painel Admin'}
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
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Todas as ações administrativas são registradas e monitoradas
          </p>
        </div>
      </div>
    </div>
  );
}