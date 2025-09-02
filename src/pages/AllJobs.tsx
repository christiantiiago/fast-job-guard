import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobs } from '@/hooks/useJobs';
import { useCategories } from '@/hooks/useCategories';
import { 
  Search,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const AllJobs = () => {
  const navigate = useNavigate();
  const { jobs, loading, error, fetchAllOpenJobs } = useJobs();
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');

  useEffect(() => {
    fetchAllOpenJobs();
  }, [fetchAllOpenJobs]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { label: 'Aberto', className: 'status-open' },
      in_progress: { label: 'Em andamento', className: 'status-progress' },
      completed: { label: 'Concluído', className: 'status-completed' },
      cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive border border-destructive/20' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.open;
    
    return (
      <Badge className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatPrice = (min?: number, max?: number) => {
    if (!min && !max) return 'A combinar';
    if (min && max) return `R$ ${min} - R$ ${max}`;
    return `R$ ${min || max}`;
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || job.category_id === selectedCategory;
    
    const matchesPrice = priceRange === 'all' || (() => {
      const maxPrice = job.budget_max || job.budget_min || 0;
      switch (priceRange) {
        case 'low': return maxPrice <= 100;
        case 'medium': return maxPrice > 100 && maxPrice <= 500;
        case 'high': return maxPrice > 500;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setPriceRange('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || priceRange !== 'all';

  if (loading) {
    return (
      <AppLayout>
        <div className="section-padding">
          <div className="container-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="card-modern">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-4" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="section-padding">
          <div className="container-center">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Erro ao carregar trabalhos</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => fetchAllOpenJobs()}>Tentar Novamente</Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="section-padding">
        <div className="container-center">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Todos os Trabalhos</h1>
            <p className="text-muted-foreground">
              Encontre oportunidades de trabalho em sua área
            </p>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Filtros</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar trabalhos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories
                    .filter(category => category.id && category.id.trim() !== '')
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Faixa de preço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os preços</SelectItem>
                  <SelectItem value="low">Até R$ 100</SelectItem>
                  <SelectItem value="medium">R$ 100 - R$ 500</SelectItem>
                  <SelectItem value="high">Acima de R$ 500</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center text-sm text-muted-foreground">
                <span>{filteredJobs.length} trabalho{filteredJobs.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Jobs Grid */}
          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card 
                  key={job.id} 
                  className="card-elevated hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                          {job.title}
                        </h3>
                        {getStatusBadge(job.status)}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {job.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-primary text-lg">
                        {formatPrice(job.budget_min, job.budget_max)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      {job.service_categories && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {job.service_categories.name}
                          </Badge>
                        </div>
                      )}

                      {job.addresses && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {job.addresses.city}, {job.addresses.state}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Publicado em {format(new Date(job.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      {job.deadline_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Prazo: {format(new Date(job.deadline_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Nenhum trabalho encontrado
                </h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters 
                    ? 'Tente ajustar os filtros para encontrar mais trabalhos.'
                    : 'Não há trabalhos disponíveis no momento.'
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AllJobs;