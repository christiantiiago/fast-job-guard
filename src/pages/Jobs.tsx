import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Briefcase
} from 'lucide-react';

export default function Jobs() {
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in real app would come from API
  const jobs = [
    {
      id: '1',
      title: 'Instalação de ar condicionado',
      description: 'Preciso instalar um ar condicionado split 12000 BTUs no quarto. Já tenho o aparelho.',
      category: 'Elétrica',
      status: 'open',
      budget: 'R$ 200 - R$ 350',
      location: 'Moema, São Paulo - SP',
      createdAt: '2024-01-20',
      proposalsCount: 5,
      clientName: 'Maria Silva'
    },
    {
      id: '2',
      title: 'Reparo em encanamento',
      description: 'Vazamento na tubulação da cozinha. Preciso de reparo urgente.',
      category: 'Hidráulica',
      status: 'in_progress',
      budget: 'R$ 150 - R$ 250',
      location: 'Vila Madalena, São Paulo - SP',
      createdAt: '2024-01-18',
      proposalsCount: 3,
      providerName: 'João Santos',
      clientName: 'Pedro Costa'
    },
    {
      id: '3',
      title: 'Pintura de apartamento',
      description: 'Pintura completa de apartamento de 2 quartos. Tinta por conta do cliente.',
      category: 'Pintura',
      status: 'completed',
      budget: 'R$ 800 - R$ 1200',
      location: 'Itaim Bibi, São Paulo - SP',
      createdAt: '2024-01-15',
      completedAt: '2024-01-19',
      rating: 5,
      clientName: 'Ana Souza'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      'open': { variant: 'default' as const, label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { variant: 'secondary' as const, label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { variant: 'default' as const, label: 'Concluído', color: 'bg-green-100 text-green-800' },
      'cancelled': { variant: 'destructive' as const, label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    };

    const config = variants[status as keyof typeof variants];
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

  const JobCard = ({ job }: { job: typeof jobs[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{job.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{job.category}</Badge>
              {getStatusBadge(job.status)}
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-primary">{job.budget}</p>
            {job.status === 'completed' && job.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm">{job.rating}/5</span>
              </div>
            )}
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
            {job.location}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Criado em {new Date(job.createdAt).toLocaleDateString('pt-BR')}
          </div>
          {job.status === 'open' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              {job.proposalsCount} proposta(s) recebida(s)
            </div>
          )}
          {job.status === 'in_progress' && job.providerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 w-4" />
              Executando: {job.providerName}
            </div>
          )}
          {job.status === 'completed' && job.completedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Concluído em {new Date(job.completedAt).toLocaleDateString('pt-BR')}
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {userRole === 'client' ? 'Meus Trabalhos' : 'Trabalhos Aplicados'}
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'client' 
                ? 'Gerencie todos os trabalhos que você publicou'
                : 'Acompanhe os trabalhos que você aplicou ou está executando'
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

        {/* Jobs by Status */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todos ({jobs.length})</TabsTrigger>
            <TabsTrigger value="open">Abertos ({filterJobsByStatus('open').length})</TabsTrigger>
            <TabsTrigger value="in_progress">Em Andamento ({filterJobsByStatus('in_progress').length})</TabsTrigger>
            <TabsTrigger value="completed">Concluídos ({filterJobsByStatus('completed').length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelados ({filterJobsByStatus('cancelled').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="open" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterJobsByStatus('open').map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
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

          <TabsContent value="cancelled" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterJobsByStatus('cancelled').map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {jobs.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum trabalho encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {userRole === 'client' 
                ? 'Você ainda não publicou nenhum trabalho.'
                : 'Você ainda não aplicou para nenhum trabalho.'
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