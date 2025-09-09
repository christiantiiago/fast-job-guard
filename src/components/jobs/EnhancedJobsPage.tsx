import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useJobs, Job } from '@/hooks/useJobs';
import { ProposalNotifications } from '@/components/jobs/ProposalNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { 
  Plus,
  Search,
  MapPin,
  Clock,
  DollarSign,
  Eye,
  MessageCircle,
  Calendar,
  Filter,
  Briefcase,
  AlertCircle,
  FileText,
  Gavel,
  Handshake,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

export function EnhancedJobsPage() {
  const { userRole } = useAuth();
  const { jobs, loading, error } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const formatCurrency = (min?: number, max?: number, final?: number) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });

    if (final) {
      return formatter.format(final);
    } else if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `A partir de ${formatter.format(min)}`;
    } else if (max) {
      return `Até ${formatter.format(max)}`;
    }
    return 'A combinar';
  };

  const formatAddress = (addresses: Job['addresses']) => {
    if (!addresses) return 'Localização não informada';
    
    const { neighborhood, city, state } = addresses;
    return [neighborhood, city, state].filter(Boolean).join(', ');
  };

  const getStatusBadge = (status: Job['status']) => {
    const variants = {
      'draft': { variant: 'outline' as const, label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
      'open': { variant: 'default' as const, label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
      'in_proposal': { variant: 'secondary' as const, label: 'Em Proposta', color: 'bg-purple-100 text-purple-800' },
      'in_progress': { variant: 'secondary' as const, label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
      'delivered': { variant: 'default' as const, label: 'Entregue', color: 'bg-orange-100 text-orange-800' },
      'completed': { variant: 'default' as const, label: 'Concluído', color: 'bg-green-100 text-green-800' },
      'cancelled': { variant: 'destructive' as const, label: 'Cancelado', color: 'bg-red-100 text-red-800' },
      'disputed': { variant: 'destructive' as const, label: 'Em Disputa', color: 'bg-red-100 text-red-800' }
    };

    const config = variants[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filterJobsByStatus = (status: string) => {
    if (status === 'all') return jobs;
    if (status === 'proposals') {
      return userRole === 'client' 
        ? jobs.filter(job => job.proposals && job.proposals.length > 0)
        : jobs.filter(job => job.status === 'in_proposal');
    }
    if (status === 'negotiations') {
      return jobs.filter(job => 
        (job.proposals && job.proposals.some((p: any) => p.status === 'countered')));
    }
    if (status === 'active') {
      return jobs.filter(job => job.status === 'in_progress');
    }
    return jobs.filter(job => job.status === status);
  };

  const filteredJobs = filterJobsByStatus(activeTab).filter(job => {
    return searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const JobCard = ({ job }: { job: Job }) => {
    const hasProposals = job.proposals && job.proposals.length > 0;
    const proposalCount = job.proposals?.length || 0;
    
    return (
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white via-white to-slate-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                  {job.title}
                </CardTitle>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {job.service_categories?.name || 'Categoria'}
                </Badge>
                {getStatusBadge(job.status)}
                {hasProposals && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    {proposalCount} proposta{proposalCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-muted-foreground line-clamp-3 leading-relaxed">
            {job.description}
          </p>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{formatAddress(job.addresses)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Criado em {new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            
            {job.deadline_at && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>Prazo: {new Date(job.deadline_at).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button asChild variant="outline" size="sm" className="flex-1 group-hover:border-primary/50">
              <Link to={`/jobs/${job.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalhes
              </Link>
            </Button>
            
            {job.status === 'in_progress' && (
              <Button asChild size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                <Link to={`/chat/${job.id}`}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Link>
              </Button>
            )}
            
            {job.status === 'open' && hasProposals && userRole === 'client' && (
              <Button asChild size="sm" variant="secondary" className="flex-1">
                <Link to={`/jobs/${job.id}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Propostas
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Erro ao carregar trabalhos
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Enhanced Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-primary/10">
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {userRole === 'client' ? 'Meus Trabalhos' : 'Meus Trabalhos'}
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    {userRole === 'client' 
                      ? 'Gerencie todos os trabalhos que você publicou e acompanhe propostas'
                      : 'Acompanhe os trabalhos que você está executando e suas propostas'
                    }
                  </p>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="text-2xl font-bold text-primary">{jobs.length}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="text-2xl font-bold text-blue-600">{filterJobsByStatus('open').length}</div>
                      <div className="text-sm text-muted-foreground">Abertos</div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="text-2xl font-bold text-yellow-600">{filterJobsByStatus('active').length}</div>
                      <div className="text-sm text-muted-foreground">Ativo</div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="text-2xl font-bold text-green-600">{filterJobsByStatus('completed').length}</div>
                      <div className="text-sm text-muted-foreground">Concluídos</div>
                    </div>
                  </div>
                </div>

                {userRole === 'client' && (
                  <Button size="lg" asChild className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                    <Link to="/jobs/new">
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Trabalho
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 right-8 w-16 h-16 bg-primary/20 rounded-full" />
          </div>

          {/* Proposal Notifications */}
          <ProposalNotifications />

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar trabalhos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/80 backdrop-blur-sm border-primary/20 focus:border-primary/40 rounded-xl"
              />
            </div>
            
            <Button variant="outline" size="lg" className="border-primary/20 hover:border-primary/40">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-2 border border-primary/10">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 bg-transparent gap-2">
                <TabsTrigger 
                  value="all" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Todos</span>
                  <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary border-0">
                    {jobs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="proposals" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Propostas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="negotiations" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Handshake className="h-4 w-4" />
                  <span className="hidden sm:inline">Negociações</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Ativos</span>
                  <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary border-0">
                    {filterJobsByStatus('active').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Concluídos</span>
                  <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary border-0">
                    {filterJobsByStatus('completed').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="disputes" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Gavel className="h-4 w-4" />
                  <span className="hidden sm:inline">Disputas</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-6">
              {filteredJobs.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <Card className="border-0 bg-white/50 backdrop-blur-sm">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {userRole === 'client' ? 'Nenhuma Proposta Recebida' : 'Nenhuma Proposta Enviada'}
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {userRole === 'client' 
                        ? 'Quando prestadores enviarem propostas para seus trabalhos, elas aparecerão aqui.'
                        : 'Propostas que você enviou para trabalhos aparecerão aqui.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="negotiations" className="space-y-6">
              {filteredJobs.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <Card className="border-0 bg-white/50 backdrop-blur-sm">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <Handshake className="h-10 w-10 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Negociações Ativas</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Contrapropostas e negociações em andamento aparecem aqui. 
                      Finalize as negociações para dar continuidade aos trabalhos.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="disputes" className="space-y-6">
              <Card className="border-0 bg-white/50 backdrop-blur-sm">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <Gavel className="h-10 w-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Disputas</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Trabalhos em disputa aparecem aqui. Entre em contato com o suporte 
                    para resolução de conflitos.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}