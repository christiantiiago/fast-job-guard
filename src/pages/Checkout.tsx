import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  Star,
  Clock,
  MapPin
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  client_name: string;
  provider_name: string;
  provider_rating: number;
  address: string;
  agreed_price: number;
  estimated_hours: number;
  delivery_date: string;
}

export default function Checkout() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [processing, setProcessing] = useState(false);

  // Mock data - em produção seria uma consulta real
  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock job data
      setJob({
        id: jobId || '1',
        title: 'Instalação Elétrica Residencial',
        description: 'Instalação de novos pontos elétricos na sala e cozinha',
        category: 'Elétrica',
        client_name: 'João Silva',
        provider_name: 'Carlos Eletricista',
        provider_rating: 4.8,
        address: 'Rua das Flores, 123 - São Paulo, SP',
        agreed_price: 450.00,
        estimated_hours: 4,
        delivery_date: '2024-01-25'
      });
      
      setLoading(false);
    };

    fetchJob();
  }, [jobId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateFees = (amount: number, isSubscriber = false) => {
    const clientFeeRate = isSubscriber ? 0.05 : 0.075; // 5% premium, 7.5% standard
    const clientFee = amount * clientFeeRate;
    const total = amount + clientFee;
    
    return { clientFee, total };
  };

  const handlePayment = async () => {
    if (!job) return;
    
    setProcessing(true);
    
    try {
      // Simular processamento de pagamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Pagamento Processado!",
        description: "O valor foi colocado em escrow. O prestador foi notificado.",
      });
      
      // Redirecionar para o job detail
      navigate(`/jobs/${jobId}`);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Job não encontrado. Verifique o link e tente novamente.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const { clientFee, total } = calculateFees(job.agreed_price);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl min-h-screen overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">Confirme os detalhes e escolha a forma de pagamento</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Job Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Detalhes do Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <Badge variant="secondary">{job.category}</Badge>
                </div>
                
                <p className="text-muted-foreground">{job.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {job.address}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    Estimativa: {job.estimated_hours}h
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    {job.provider_rating} - {job.provider_name}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
                <CardDescription>
                  Escolha como deseja pagar pelo serviço
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={setPaymentMethod}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="credit-card" id="credit-card" />
                    <Label htmlFor="credit-card" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <div className="font-medium">Cartão de Crédito</div>
                          <div className="text-sm text-muted-foreground">
                            Visa, Mastercard, American Express
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5" />
                        <div>
                          <div className="font-medium">PIX</div>
                          <div className="text-sm text-muted-foreground">
                            Pagamento instantâneo
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Valor do serviço</span>
                  <span>{formatCurrency(job.agreed_price)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa da plataforma (7,5%)</span>
                  <span>{formatCurrency(clientFee)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pagamento Seguro:</strong> O valor ficará em escrow até a conclusão do serviço.
                  </AlertDescription>
                </Alert>
                
                <div className="pt-4">
                  <Button 
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? 'Processando...' : `Pagar ${formatCurrency(total)}`}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Ao confirmar, você concorda com nossos Termos de Serviço
                </p>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">💎 Quer economizar?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Com o plano Premium, você pagaria apenas 5% de taxa (ao invés de 7,5%)
                </p>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="line-through text-muted-foreground">Taxa atual (7,5%):</span>
                    <span className="line-through text-muted-foreground">{formatCurrency(clientFee)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Taxa Premium (5%):</span>
                    <span>{formatCurrency(job.agreed_price * 0.05)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Economia:</span>
                    <span>{formatCurrency(clientFee - (job.agreed_price * 0.05))}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Assinar Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}