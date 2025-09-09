import { useState } from 'react';
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

  const filteredJobs = jobs.filter(job => {
    return searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase());
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

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar trabalhos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Todos ({jobs.length})
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Propostas (0)
            </TabsTrigger>
            <TabsTrigger value="negotiations" className="flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Negociações (0)
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ativos ({filterJobsByStatus('in_progress').length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluídos ({filterJobsByStatus('completed').length})
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Disputas (0)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="space-y-4">
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Propostas Enviadas</h3>
                <p className="text-muted-foreground">
                  Aqui você verá todas as propostas que enviou para trabalhos
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="negotiations" className="space-y-4">
            <Card>
              <CardContent className="text-center py-12">
                <Handshake className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Negociações Ativas</h3>
                <p className="text-muted-foreground">
                  Contratos e negociações em andamento aparecerão aqui
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterJobsByStatus('in_progress').map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterJobsByStatus('completed').map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardContent className="text-center py-12">
                <Gavel className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Disputas</h3>
                <p className="text-muted-foreground">
                  Disputas e conflitos serão exibidos aqui
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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