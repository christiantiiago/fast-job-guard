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
import { useFeeRules } from '@/hooks/useFeeRules';
import { supabase } from '@/integrations/supabase/client';
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
  provider_id: string;
}

export default function Checkout() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { calculateFees, formatCurrency } = useFeeRules();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      
      setLoading(true);
      
      try {
        // Buscar job com dados relacionados
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            description,
            final_price,
            deadline_at,
            provider_id,
            service_categories!inner(name),
            addresses!inner(
              street,
              number,
              neighborhood,
              city,
              state
            )
          `)
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        if (jobData && jobData.provider_id) {
          // Buscar dados do prestador
          const { data: providerData } = await supabase
            .from('profiles')
            .select('full_name, rating_avg')
            .eq('user_id', jobData.provider_id)
            .single();

          // Buscar proposta aceita para obter detalhes adicionais
          const { data: proposalData } = await supabase
            .from('proposals')
            .select('price, estimated_hours, delivery_date')
            .eq('job_id', jobId)
            .eq('status', 'accepted')
            .single();

          const address = jobData.addresses;
          
          setJob({
            id: jobData.id,
            title: jobData.title,
            description: jobData.description,
            category: jobData.service_categories?.name || 'Serviço',
            client_name: user?.user_metadata?.full_name || 'Cliente',
            provider_name: providerData?.full_name || 'Prestador',
            provider_rating: providerData?.rating_avg || 0,
            address: `${address?.street}, ${address?.number} - ${address?.neighborhood}, ${address?.city}/${address?.state}`,
            agreed_price: proposalData?.price || jobData.final_price || 0,
            estimated_hours: proposalData?.estimated_hours || 4,
            delivery_date: proposalData?.delivery_date || jobData.deadline_at || new Date().toISOString(),
            provider_id: jobData.provider_id
          });
        }
      } catch (error) {
        console.error('Erro ao buscar job:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados do serviço.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId, user, toast]);


  const handlePayment = async () => {
    if (!job || !user) return;
    
    setProcessing(true);
    
    try {
      // Criar pagamento escrow via edge function
      const { data, error } = await supabase.functions.invoke('create-escrow-payment', {
        body: {
          jobId: jobId,
          providerId: job.provider_id,
          amount: job.agreed_price,
          platformFee: calculateFees(job.agreed_price).platformFee,
          paymentMethod: paymentMethod === 'credit-card' ? 'card' : 'pix'
        }
      });

      if (error) throw error;

      // Redirecionar para Stripe Checkout
      if (data.clientSecret) {
        // Se usando Stripe Elements
        window.location.href = `https://checkout.stripe.com/pay/${data.clientSecret}`;
      } else if (data.url) {
        // Se usando Stripe Checkout Session
        window.open(data.url, '_blank');
      }
      
      toast({
        title: "Redirecionando para Pagamento",
        description: "Você será redirecionado para completar o pagamento seguro.",
      });
      
    } catch (error) {
      console.error('Erro no pagamento:', error);
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

  const fees = calculateFees(job.agreed_price);

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">Confirme os detalhes e escolha a forma de pagamento</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
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
                  <span>Taxa da plataforma ({fees.feePercentage}%)</span>
                  <span>{formatCurrency(fees.platformFee)}</span>
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa do gateway de pagamento</span>
                  <span>{formatCurrency(fees.processingFee)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total a pagar</span>
                  <span className="text-primary">{formatCurrency(fees.total)}</span>
                </div>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pagamento Seguro e Protegido:</strong>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Valor fica em garantia até a conclusão do serviço</li>
                      <li>Contrato automático entre cliente e prestador</li>
                      <li>Chat liberado para comunicação direta</li>
                      <li>Sistema de disputas disponível se necessário</li>
                      <li>Pagamento liberado em 7 dias ou quando sinalizado</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <div className="pt-4">
                  <Button 
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? 'Processando...' : `Pagar ${formatCurrency(fees.total)}`}
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
                    <span className="line-through text-muted-foreground">Taxa atual ({fees.feePercentage}%):</span>
                    <span className="line-through text-muted-foreground">{formatCurrency(fees.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Taxa Premium (5%):</span>
                    <span>{formatCurrency(job.agreed_price * 0.05)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Economia:</span>
                    <span>{formatCurrency(fees.platformFee - (job.agreed_price * 0.05))}</span>
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
      </div>
    </AppLayout>
  );
}