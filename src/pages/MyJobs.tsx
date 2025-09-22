import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MapPin, 
  DollarSign, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  Star,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
  created_at: string;
  client_id?: string;
  category_id?: string;
  address_id?: string;
}

interface Proposal {
  id: string;
  job_id: string;
  price: number;
  message: string;
  status: string;
  created_at: string;
  delivery_date?: string;
  estimated_hours?: number;
  jobs?: Job;
}

interface Dispute {
  id: string;
  job_id: string;
  reason: string;
  status: string;
  created_at: string;
  jobs?: Job;
}

interface CounterOffer {
  id: string;
  proposal_id: string;
  price: number;
  message: string;
  status: string;
  offered_by: string;
  created_at: string;
}

export default function MyJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Data states
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [negotiations, setNegotiations] = useState<CounterOffer[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  useEffect(() => {
    if (user) {
      fetchMyJobs();
    }
  }, [user]);

  const fetchMyJobs = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar propostas do prestador
      const { data: proposalsData } = await supabase
        .from('proposals')
        .select(`
          *,
          jobs (
            id, title, description, budget_min, budget_max, final_price,
            status, created_at,
            service_categories (name, color),
            addresses (city, state),
            profiles!jobs_client_id_fkey (full_name, avatar_url)
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      // Buscar trabalhos ativos onde é o prestador
      const { data: activeJobsData } = await supabase
        .from('jobs')
        .select(`
          id, title, description, budget_min, budget_max, final_price,
          status, created_at,
          service_categories (name, color),
          addresses (city, state),
          profiles!jobs_client_id_fkey (full_name, avatar_url)
        `)
        .eq('provider_id', user.id)
        .in('status', ['in_progress', 'delivered']);

      // Buscar trabalhos concluídos
      const { data: completedJobsData } = await supabase
        .from('jobs')
        .select(`
          id, title, description, budget_min, budget_max, final_price,
          status, created_at,
          service_categories (name, color),
          addresses (city, state),
          profiles!jobs_client_id_fkey (full_name, avatar_url)
        `)
        .eq('provider_id', user.id)
        .eq('status', 'completed');

      // Buscar disputas
      const { data: disputesData } = await supabase
        .from('disputes')
        .select(`
          *,
          jobs (
            id, title, description, budget_min, budget_max, final_price,
            status, created_at,
            service_categories (name, color),
            addresses (city, state),
            profiles!jobs_client_id_fkey (full_name, avatar_url)
          )
        `)
        .eq('opened_by_user_id', user.id);

      // Buscar negociações (counter offers)
      const proposalIds = proposalsData?.map(p => p.id) || [];
      const { data: negotiationsData } = await supabase
        .from('counter_offers')
        .select('*')
        .in('proposal_id', proposalIds)
        .eq('status', 'pending');

      setProposals((proposalsData as any) || []);
      setActiveJobs((activeJobsData as any) || []);
      setCompletedJobs((completedJobsData as any) || []);
      setDisputes((disputesData as any) || []);
      setNegotiations(negotiationsData || []);

    } catch (error) {
      console.error('Error fetching my jobs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus trabalhos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: { label: 'Enviada', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Aceita', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeitada', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      in_progress: { label: 'Em Andamento', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      delivered: { label: 'Entregue', variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800' },
      completed: { label: 'Concluído', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      open: { label: 'Aberta', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
    };

    const config = variants[status as keyof typeof variants] || variants.sent;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const JobCard = ({ job, proposal, type }: { job: Job; proposal?: Proposal; type: string }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{job.title}</h3>
              {type === 'proposal' && proposal && getStatusBadge(proposal.status)}
              {type !== 'proposal' && getStatusBadge(job.status)}
            </div>
            
            <p className="text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>
                  {proposal?.price 
                    ? formatCurrency(proposal.price)
                    : job.final_price 
                      ? formatCurrency(job.final_price)
                      : `${formatCurrency(job.budget_min || 0)} - ${formatCurrency(job.budget_max || 0)}`
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>Localização não informada</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/jobs/${job.id}`}>
                <Eye className="h-4 w-4 mr-1" />
                Ver Detalhes
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Categoria
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const filteredData = (data: any[], searchField: string) => {
    return data.filter(item => {
      const job = item.jobs || item;
      const matchesSearch = !searchTerm || 
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Trabalhos</h1>
            <p className="text-muted-foreground">
              Acompanhe todas as suas atividades e propostas
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar trabalhos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="accepted">Aceito</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Propostas ({proposals.length})
            </TabsTrigger>
            <TabsTrigger value="negotiations" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Negociações ({negotiations.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Ativos ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Concluídos ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputas ({disputes.length})
            </TabsTrigger>
          </TabsList>

          {/* Propostas */}
          <TabsContent value="proposals" className="mt-6">
            <div className="space-y-4">
              {filteredData(proposals, 'title').length > 0 ? (
                filteredData(proposals, 'title').map((proposal) => (
                  <JobCard 
                    key={proposal.id} 
                    job={proposal.jobs} 
                    proposal={proposal}
                    type="proposal"
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Nenhuma proposta encontrada</h3>
                    <p className="text-muted-foreground">
                      Você ainda não fez nenhuma proposta. Explore trabalhos disponíveis!
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/discover">Descobrir Trabalhos</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Negociações */}
          <TabsContent value="negotiations" className="mt-6">
            <div className="space-y-4">
              {negotiations.length > 0 ? (
                negotiations.map((negotiation) => {
                  const proposal = proposals.find(p => p.id === negotiation.proposal_id);
                  return proposal?.jobs ? (
                    <Card key={negotiation.id} className="mb-4">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{proposal.jobs.title}</h3>
                            <div className="mt-2 p-3 bg-accent/10 rounded-lg">
                              <p className="text-sm font-medium text-accent">
                                Contraoferta: {formatCurrency(negotiation.price)}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {negotiation.message}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/jobs/${proposal.jobs.id}`}>
                              Ver Negociação
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null;
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Nenhuma negociação ativa</h3>
                    <p className="text-muted-foreground">
                      Não há negociações pendentes no momento.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Trabalhos Ativos */}
          <TabsContent value="active" className="mt-6">
            <div className="space-y-4">
              {filteredData(activeJobs, 'title').length > 0 ? (
                filteredData(activeJobs, 'title').map((job) => (
                  <JobCard key={job.id} job={job} type="active" />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Nenhum trabalho ativo</h3>
                    <p className="text-muted-foreground">
                      Você não possui trabalhos em andamento no momento.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Trabalhos Concluídos */}
          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
              {filteredData(completedJobs, 'title').length > 0 ? (
                filteredData(completedJobs, 'title').map((job) => (
                  <JobCard key={job.id} job={job} type="completed" />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Nenhum trabalho concluído</h3>
                    <p className="text-muted-foreground">
                      Complete seus primeiros trabalhos para vê-los aqui.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Disputas */}
          <TabsContent value="disputes" className="mt-6">
            <div className="space-y-4">
              {disputes.length > 0 ? (
                disputes.map((dispute) => (
                  <Card key={dispute.id} className="mb-4 border-destructive/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{dispute.jobs?.title}</h3>
                            <Badge variant="destructive">Disputa</Badge>
                          </div>
                          
                          <div className="mt-2 p-3 bg-destructive/10 rounded-lg">
                            <p className="text-sm font-medium">Motivo: {dispute.reason}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Criada em {new Date(dispute.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/jobs/${dispute.jobs?.id}`}>
                            Ver Disputa
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Nenhuma disputa</h3>
                    <p className="text-muted-foreground">
                      Ótimo! Você não possui disputas abertas.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}