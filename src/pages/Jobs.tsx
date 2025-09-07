import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useJobs, Job } from '@/hooks/useJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import JobsMap from '@/components/jobs/JobsMap';
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
  Map,
  List,
  LayoutGrid
} from 'lucide-react';

interface JobMapData {
  id: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
  service_categories?: {
    name: string;
    color?: string;
  };
  addresses?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

export default function Jobs() {
  const { userRole } = useAuth();
  const { jobs, loading, error, fetchAllPublicJobs } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Load public jobs when in map mode
  useEffect(() => {
    if (viewMode === 'map') {
      fetchAllPublicJobs();
    }
  }, [viewMode, fetchAllPublicJobs]);
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
    return jobs.filter(job => job.status === status);
  };

  // Filter jobs for providers - only show jobs they are actively working on
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For providers, only show jobs they are working on (in_progress status)
    if (userRole === 'provider') {
      return matchesSearch && job.status === 'in_progress';
    }
    
    return matchesSearch;
  });

  const JobCard = ({ job }: { job: Job }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{job.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                {job.service_categories?.name || 'Categoria'}
              </Badge>
              {getStatusBadge(job.status)}
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-primary">
              {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </p>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {formatAddress(job.addresses)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Criado em {new Date(job.created_at).toLocaleDateString('pt-BR')}
          </div>
          {job.status === 'open' && job.proposals && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              {job.proposals.length} proposta(s) recebida(s)
            </div>
          )}
          {job.status === 'in_progress' && job.provider_id && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Em execução
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/jobs/${job.id}`}>
              <Eye className="w-4 h-4 mr-2" />
              Ver detalhes
            </Link>
          </Button>
          {job.status === 'in_progress' && (
            <Button asChild size="sm" className="flex-1">
              <Link to={`/chat/${job.id}`}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {userRole === 'client' ? 'Meus Trabalhos' : 'Meus Trabalhos'}
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'client' 
                ? 'Gerencie todos os trabalhos que você publicou'
                : 'Acompanhe os trabalhos que você está executando'
              }
            </p>
          </div>

          {userRole === 'client' && (
            <Button asChild>
              <Link to="/jobs/new">
                <Plus className="mr-2 h-4 w-4" />
                Novo Trabalho
              </Link>
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, categoria ou localização..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Content */}
        {userRole === 'provider' ? (
          /* For providers, show simple list without tabs */
          <div className="grid gap-4 md:grid-cols-2">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          /* Jobs by Status - Only for clients */
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todos ({filteredJobs.length})</TabsTrigger>
              <TabsTrigger value="open">Abertos ({filterJobsByStatus('open').filter(j => filteredJobs.includes(j)).length})</TabsTrigger>
              <TabsTrigger value="in_progress">Em Andamento ({filterJobsByStatus('in_progress').filter(j => filteredJobs.includes(j)).length})</TabsTrigger>
              <TabsTrigger value="completed">Concluídos ({filterJobsByStatus('completed').filter(j => filteredJobs.includes(j)).length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados ({filterJobsByStatus('cancelled').filter(j => filteredJobs.includes(j)).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="open" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterJobsByStatus('open').filter(j => filteredJobs.includes(j)).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterJobsByStatus('in_progress').filter(j => filteredJobs.includes(j)).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterJobsByStatus('completed').filter(j => filteredJobs.includes(j)).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterJobsByStatus('cancelled').filter(j => filteredJobs.includes(j)).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum trabalho encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {userRole === 'client' 
                ? 'Você ainda não publicou nenhum trabalho.'
                : 'Você não tem trabalhos em andamento no momento.'
              }
            </p>
            {userRole === 'client' && (
              <Button asChild>
                <Link to="/jobs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Trabalho
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}