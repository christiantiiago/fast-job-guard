import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJobs, Job } from '@/hooks/useJobs';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { 
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  MessageCircle,
  Briefcase,
  Users,
  AlertCircle,
  Map,
  List,
  Info,
  Star,
  Clock,
  Filter
} from 'lucide-react';

export default function DiscoverJobsPage() {
  const { jobs, loading, error, fetchAllOpenJobs } = useJobs();
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');

  useEffect(() => {
    fetchAllOpenJobs();
  }, []);

  const formatCurrency = (min?: number, max?: number) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });

    if (min && max) {
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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || selectedCategory === 'all' || job.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="p-4 space-y-4 pb-24">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
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
      <AppLayout showKYCBanner={false}>
        <div className="p-4 pb-24">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Erro ao carregar trabalhos
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchAllOpenJobs()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showKYCBanner={false}>
      <div className="p-4 space-y-6 pb-24">
        {/* Banner promocional */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
            <div className="relative z-10">
              <Badge className="mb-2 bg-white/20 text-white hover:bg-white/25 border-0">
                Lista
              </Badge>
              <h2 className="text-xl font-bold mb-1">Descobrir Trabalhos</h2>
              <p className="text-white/90 text-sm">
                Encontre trabalhos abertos e envie suas propostas
              </p>
            </div>
          </div>
        </Card>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, descrição ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories
                  .filter(category => category.id && category.id.trim() !== '')
                  .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="px-3"
            >
              <Briefcase className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} trabalho(s) encontrado(s)
          </p>
        </div>

        {/* Jobs Grid/List */}
        {filteredJobs.length > 0 ? (
          <div className={viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg line-clamp-2 mb-1">{job.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant="outline" className="text-xs">
                            {job.service_categories?.name || 'Categoria'}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                            Aberto
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {formatCurrency(job.budget_min, job.budget_max)}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{formatAddress(job.addresses)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>Publicado em {new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span>Cliente: {job.profiles?.full_name || 'Nome não informado'}</span>
                      </div>
                      
                      {job.proposals && job.proposals.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{job.proposals.length} proposta(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/jobs/${job.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum trabalho encontrado
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== 'all'
                ? 'Tente ajustar os filtros para encontrar mais trabalhos.'
                : 'Não há trabalhos disponíveis no momento.'
              }
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}