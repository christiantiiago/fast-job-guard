import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp,
  Zap,
  Target,
  Clock,
  Users,
  ArrowLeft,
  CheckCircle,
  Star,
  Eye,
  MessageSquare
} from 'lucide-react';

export default function JobBoost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedBoostType, setSelectedBoostType] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's active jobs
  useState(() => {
    const fetchJobs = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            service_categories!fk_jobs_category(name, icon_name),
            proposals(id)
          `)
          .eq('client_id', user.id)
          .in('status', ['open', 'draft'])
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setUserJobs(data || []);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast.error('Erro ao carregar seus trabalhos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  });

  const boostTypes = [
    {
      id: 'highlight',
      name: 'Destaque',
      icon: Star,
      price: 19.90,
      duration: '24 horas',
      description: 'Seu trabalho aparece destacado no topo da lista',
      features: ['Destaque visual', 'Prioridade na busca', '24h de duração']
    },
    {
      id: 'urgent',
      name: 'Urgente',
      icon: Zap,
      price: 39.90,
      duration: '48 horas',
      description: 'Marca como urgente e envia notificações para prestadores',
      features: ['Badge de urgência', 'Notificações push', '48h de duração', 'Prioridade máxima']
    },
    {
      id: 'premium',
      name: 'Super Boost',
      icon: Target,
      price: 79.90,
      duration: '7 dias',
      description: 'Máxima visibilidade com todos os recursos premium',
      features: ['Destaque premium', 'Notificações para 50+ prestadores', '7 dias de duração', 'Suporte prioritário']
    }
  ];

  const handleBoost = async () => {
    if (!selectedJob || !selectedBoostType) {
      toast.error('Selecione um trabalho e tipo de impulsionamento');
      return;
    }

    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('create-boost-payment', {
        body: {
          jobId: selectedJob,
          boostType: selectedBoostType,
          paymentMethod: 'card'
        }
      });

      if (error) throw error;

      toast.success('Redirecionando para pagamento...');
      window.open(data.url, '_blank');

    } catch (error: any) {
      console.error('Error creating boost payment:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const selectedBoost = boostTypes.find(b => b.id === selectedBoostType);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/jobs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Impulsionar Trabalho</h1>
            <p className="text-muted-foreground">
              Destaque seu trabalho e receba mais propostas de qualidade
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Selection */}
          <div className="space-y-6">
            {/* Job Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Selecionar Trabalho
                </CardTitle>
                <CardDescription>
                  Escolha o trabalho que deseja impulsionar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um trabalho" />
                  </SelectTrigger>
                  <SelectContent>
                    {userJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{job.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {job.proposals?.length || 0} propostas
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {userJobs.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">
                      Você não tem trabalhos ativos para impulsionar.
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/jobs/new">Criar Novo Trabalho</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Boost Types */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Impulsionamento</CardTitle>
                <CardDescription>
                  Escolha o nível de destaque ideal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {boostTypes.map((boost) => (
                  <div
                    key={boost.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedBoostType === boost.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedBoostType(boost.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        selectedBoostType === boost.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <boost.icon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{boost.name}</h4>
                          <div className="text-right">
                            <div className="font-bold text-primary">R$ {boost.price.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{boost.duration}</div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {boost.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-1">
                          {boost.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Action */}
          <div className="space-y-6">
            {/* Selected Preview */}
            {selectedJob && selectedBoost && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Impulsionamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Trabalho:</span>
                      <span className="text-sm font-medium truncate ml-2">
                        {userJobs.find(j => j.id === selectedJob)?.title}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Tipo:</span>
                      <span className="text-sm font-medium">{selectedBoost.name}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Duração:</span>
                      <span className="text-sm font-medium">{selectedBoost.duration}</span>
                    </div>
                    
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold text-primary text-lg">
                        R$ {selectedBoost.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleBoost}
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Impulsionar Agora
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Por que Impulsionar?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Mais Visibilidade</h5>
                    <p className="text-xs text-muted-foreground">
                      Seu trabalho aparece primeiro nas buscas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Mais Propostas</h5>
                    <p className="text-xs text-muted-foreground">
                      Receba até 300% mais propostas qualificadas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Contratação Mais Rápida</h5>
                    <p className="text-xs text-muted-foreground">
                      Encontre o prestador ideal em menos tempo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Impulsionamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Trabalhos impulsionados este mês:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxa de contratação com boost:</span>
                    <span className="font-medium text-green-600">+245%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tempo médio para contratação:</span>
                    <span className="font-medium text-blue-600">4.2 horas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}