import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  DollarSign, 
  Calendar,
  MapPin,
  User,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

interface JobInProgress {
  id: string;
  title: string;
  description: string;
  status: string;
  final_price: number;
  deadline_at: string;
  created_at: string;
  client_id: string;
  provider_id: string;
  client_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
  provider_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
  addresses: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  escrow_payments: {
    id: string;
    status: string;
    amount: number;
    total_amount: number;
  }[];
  contracts: {
    id: string;
    status: string;
    client_signed: boolean;
    provider_signed: boolean;
  }[];
}

export default function JobsInProgress() {
  const [jobs, setJobs] = useState<JobInProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendNotification } = useRealTimeNotifications();

  useEffect(() => {
    fetchJobsInProgress();
  }, [user, userRole]);

  const fetchJobsInProgress = async () => {
    if (!user) return;

    try {
      // Fetch jobs in progress with proper structure
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client_profile:profiles!jobs_client_id_fkey(full_name, avatar_url),
          provider_profile:profiles!jobs_provider_id_fkey(full_name, avatar_url),
          addresses(street, number, neighborhood, city, state)
        `)
        .eq('status', 'in_progress')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and fetch related data separately
      const transformedJobs: JobInProgress[] = [];
      
      for (const job of data || []) {
        // Fetch escrow payments
        const { data: escrowData } = await supabase
          .from('escrow_payments')
          .select('id, status, amount, total_amount')
          .eq('job_id', job.id);

        // Fetch contracts
        const { data: contractData } = await supabase
          .from('contracts')
          .select('id, status, client_signed, provider_signed')
          .eq('job_id', job.id);

        transformedJobs.push({
          ...job,
          client_profile: Array.isArray(job.client_profile) ? job.client_profile[0] : job.client_profile,
          provider_profile: Array.isArray(job.provider_profile) ? job.provider_profile[0] : job.provider_profile,
          addresses: Array.isArray(job.addresses) ? job.addresses[0] : job.addresses,
          escrow_payments: escrowData || [],
          contracts: contractData || []
        });
      }

      setJobs(transformedJobs);
    } catch (error) {
      console.error('Error fetching jobs in progress:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os trabalhos em andamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = async (job: JobInProgress) => {
    try {
      // Liberar pagamento do escrow
      const escrowPayment = job.escrow_payments[0];
      if (escrowPayment) {
        const { error: escrowError } = await supabase.functions.invoke('release-escrow-payment', {
          body: {
            escrowPaymentId: escrowPayment.id,
            releaseType: 'manual'
          }
        });

        if (escrowError) throw escrowError;
      }

      // Atualizar status do job
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);

      if (jobError) throw jobError;

      // Enviar notificação para o prestador
      await sendNotification(
        job.provider_id,
        'job_completed',
        'Trabalho Concluído!',
        `O trabalho "${job.title}" foi marcado como concluído pelo cliente. Seu pagamento foi liberado.`,
        { jobId: job.id, amount: job.final_price },
        3
      );

      toast({
        title: "Trabalho concluído!",
        description: "O pagamento foi liberado para o prestador.",
      });

      fetchJobsInProgress();
    } catch (error) {
      console.error('Error completing job:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir o trabalho.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getProgressPercentage = (job: JobInProgress) => {
    const contract = job.contracts[0];
    if (!contract) return 25;
    
    let progress = 25; // Começou
    if (contract.client_signed && contract.provider_signed) progress = 50; // Contrato assinado
    if (contract.status === 'active') progress = 75; // Em execução
    
    return progress;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex gap-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Trabalhos em Andamento</h1>
          <p className="text-muted-foreground">
            Gerencie seus trabalhos ativos e acompanhe o progresso
          </p>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum trabalho em andamento</h3>
              <p className="text-muted-foreground mb-4">
                Você não possui trabalhos ativos no momento.
              </p>
              <Button onClick={() => navigate('/jobs')}>
                Ver Todos os Trabalhos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => {
              const isClient = job.client_id === user?.id;
              const otherProfile = isClient ? job.provider_profile : job.client_profile;
              const contract = job.contracts[0];
              const escrowPayment = job.escrow_payments[0];
              const progress = getProgressPercentage(job);

              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>
                            {isClient ? 'Prestador' : 'Cliente'}: {otherProfile?.full_name || 'Nome não disponível'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Em Andamento
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Progresso do Trabalho</span>
                        <span className="text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Job Details */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            <strong>Valor:</strong> {formatCurrency(job.final_price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            <strong>Prazo:</strong> {formatDate(job.deadline_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">
                            <strong>Local:</strong> {job.addresses?.street}, {job.addresses?.neighborhood}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Contract Status */}
                        {contract && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Status do Contrato</span>
                              <Badge variant="outline">
                                {contract.status === 'active' ? 'Ativo' : 'Pendente'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                {contract.client_signed ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-orange-500" />
                                )}
                                Cliente {contract.client_signed ? 'assinou' : 'não assinou'}
                              </div>
                              <div className="flex items-center gap-2">
                                {contract.provider_signed ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-orange-500" />
                                )}
                                Prestador {contract.provider_signed ? 'assinou' : 'não assinou'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Escrow Status */}
                        {escrowPayment && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Pagamento Garantido
                              </span>
                            </div>
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                              {formatCurrency(escrowPayment.amount)} protegido em escrow
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Descrição do Trabalho</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/chat/${job.id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/contracts')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Contrato
                      </Button>

                      {isClient && (
                        <Button
                          onClick={() => handleCompleteJob(job)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marcar como Concluído
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}