import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, User, Wrench, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const { user, signUp, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    role: 'client' as 'client' | 'provider'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('🔄 Starting registration process...');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('Você deve aceitar os termos de serviço');
      setIsLoading(false);
      return;
    }

    try {
      console.log('📝 Calling signUp with data:', {
        email: formData.email,
        role: formData.role,
        full_name: formData.fullName,
        phone: formData.phone
      });

      const { error } = await signUp(formData.email, formData.password, {
        role: formData.role,
        full_name: formData.fullName,
        phone: formData.phone
      });
      
      if (error) {
        console.log('❌ SignUp error:', error);
        setError(error.message);
        toast.error('Erro ao criar conta', {
          description: error.message
        });
      } else {
        console.log('✅ SignUp successful!');
        toast.success('Conta criada com sucesso!', {
          description: formData.role === 'provider' 
            ? 'Complete seu perfil para começar a receber trabalhos'
            : 'Você já pode começar a publicar trabalhos'
        });
      }
    } catch (err) {
      console.log('💥 SignUp exception:', err);
      setError('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 primary-gradient rounded-2xl flex items-center justify-center mb-4 shadow-primary">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-muted-foreground mt-2">
            Junte-se ao Job Fast e comece hoje mesmo
          </p>
        </div>

        {/* Registration Form */}
        <Card className="card-modern">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Nova conta</CardTitle>
            <CardDescription>
              Escolha seu tipo de perfil e preencha os dados
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Role Selection */}
              <div className="space-y-3">
                <Label>Tipo de conta</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'client' | 'provider' }))}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="client" id="client" className="sr-only" />
                    <Label
                      htmlFor="client"
                      className={`flex flex-col items-center justify-center rounded-lg border-2 border-muted p-4 hover:bg-muted cursor-pointer transition-colors ${
                        formData.role === 'client' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <User className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Cliente</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Publico trabalhos
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="provider" id="provider" className="sr-only" />
                    <Label
                      htmlFor="provider"
                      className={`flex flex-col items-center justify-center rounded-lg border-2 border-muted p-4 hover:bg-muted cursor-pointer transition-colors ${
                        formData.role === 'provider' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <Wrench className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Prestador</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Realizo serviços
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Personal Data */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome completo"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                      disabled={isLoading}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Digite a senha novamente"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  disabled={isLoading}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Aceito os{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    termos de serviço
                  </Link>{' '}
                  e{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    política de privacidade
                  </Link>
                </label>
              </div>

              {formData.role === 'provider' && (
                <Alert>
                  <AlertDescription>
                    Prestadores precisam completar o processo de verificação (KYC) 
                    antes de começar a receber trabalhos.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar conta'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link 
                  to="/auth/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Fazer login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}