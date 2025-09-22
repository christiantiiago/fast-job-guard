import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, TrendingUp, ArrowRight, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function BoostSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [boostData, setBoostData] = useState<any>(null);

  useEffect(() => {
    const updateBoostStatus = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Buscar dados do boost pela session_id
        const { data: boost, error } = await supabase
          .from('job_boosts')
          .select(`
            *,
            jobs(title, id)
          `)
          .eq('stripe_session_id', sessionId)
          .single();

        if (error) throw error;

        if (boost) {
          setBoostData(boost);
          
          // Atualizar status do boost para ativo
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + boost.duration_hours);

          const { error: updateError } = await supabase
            .from('job_boosts')
            .update({
              status: 'active',
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
            })
            .eq('id', boost.id);

          if (updateError) {
            console.error('Erro ao ativar boost:', updateError);
          } else {
            toast.success('Boost ativado com sucesso!', {
              description: `Seu trabalho está em destaque por ${boost.duration_hours}h`
            });
          }
        }
      } catch (error) {
        console.error('Erro ao processar boost:', error);
        toast.error('Erro ao processar boost');
      } finally {
        setLoading(false);
      }
    };

    updateBoostStatus();
  }, [sessionId]);

  const getBoostTypeDisplay = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'express': { label: 'Express', color: 'bg-yellow-500' },
      'turbo': { label: 'Turbo', color: 'bg-orange-500' },
      'premium': { label: 'Premium', color: 'bg-purple-500' },
      'platinum': { label: 'Platinum', color: 'bg-blue-500' },
      'diamond': { label: 'Diamond', color: 'bg-pink-500' },
      'ultimate': { label: 'Ultimate', color: 'bg-gradient-to-r from-purple-500 to-pink-500' }
    };
    return types[type] || { label: type, color: 'bg-primary' };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Processando seu boost...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!boostData) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Boost não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Não foi possível encontrar os dados do boost.
              </p>
              <Button asChild className="w-full">
                <Link to="/jobs">
                  Voltar aos Trabalhos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const boostTypeInfo = getBoostTypeDisplay(boostData.boost_type);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {/* Success Icon */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <CheckCircle className="h-16 w-16 text-white animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2">
                <TrendingUp className="h-8 w-8 text-primary animate-bounce" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Boost Ativado com Sucesso! 🎉
              </h1>
              <p className="text-xl text-muted-foreground">
                Seu trabalho está agora em destaque na plataforma
              </p>
            </div>

            {/* Boost Details Card */}
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Badge className={`${boostTypeInfo.color} text-white px-6 py-2 text-lg`}>
                    Boost {boostTypeInfo.label}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{boostData.jobs?.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(boostData.amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Pago</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-secondary">
                      {boostData.duration_hours}h
                    </div>
                    <div className="text-sm text-muted-foreground">Duração</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      Ativo
                    </div>
                    <div className="text-sm text-muted-foreground">Status</div>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    O que acontece agora?
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      Seu trabalho está em posição de destaque
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      Prestadores verão seu anúncio primeiro
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      Você receberá mais propostas qualificadas
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      Acompanhe as estatísticas em tempo real
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button asChild className="flex-1" size="lg">
                    <Link to={`/jobs/${boostData.job_id}`}>
                      Ver Trabalho
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="flex-1" size="lg">
                    <Link to="/jobs">
                      <Home className="mr-2 h-4 w-4" />
                      Meus Trabalhos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Precisa de ajuda? Entre em contato com nosso suporte
              </p>
              <Button variant="link" asChild>
                <Link to="/help">Central de Ajuda</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}