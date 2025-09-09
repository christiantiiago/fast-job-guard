import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Map, 
  List, 
  Search, 
  Loader2,
  AlertTriangle,
  Eye,
  MessageSquare,
  MapPin
} from 'lucide-react';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { DiscoverMap } from '@/components/discover/DiscoverMap';

interface JobWithDistance {
  id: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
  created_at: string;
  completed_at?: string;
  service_categories?: {
    name: string;
    color?: string;
  };
  addresses?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  distance?: number;
  proposal_count?: number;
  routeDistance?: number;
  routeDuration?: number;
}

export default function Discover() {
  const { jobs, loading, fetchAllPublicJobs } = useJobs();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jobsWithDistance, setJobsWithDistance] = useState<JobWithDistance[]>([]);

  // Fetch jobs and calculate proposal counts
  useEffect(() => {
    const fetchJobsWithProposals = async () => {
      try {
        await fetchAllPublicJobs();
        
        // Get proposal counts for each job
        const { data: proposalCounts } = await supabase
          .from('proposals')
          .select('job_id')
          .eq('status', 'sent');
          
        if (proposalCounts) {
          const countMap = proposalCounts.reduce((acc, proposal) => {
            acc[proposal.job_id] = (acc[proposal.job_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Update jobs with proposal counts
          const updatedJobs = jobs.map(job => ({
            ...job,
            proposal_count: countMap[job.id] || 0
          }));
          
          setJobsWithDistance(updatedJobs as JobWithDistance[]);
        }
      } catch (error) {
        console.error('[JOBS] Error fetching:', error);
      }
    };

    if (jobs.length > 0) {
      fetchJobsWithProposals();
    }
  }, [jobs, fetchAllPublicJobs]);

  // Filter jobs by completion time (completed jobs only show for 2 minutes)
  const filterJobsByTime = (jobsList: JobWithDistance[]) => {
    const now = new Date();
    return jobsList.filter(job => {
      // Always show open and in_progress jobs
      if (job.status === 'open' || job.status === 'in_progress') {
        return true;
      }
      
      // For completed jobs, only show if completed within last 2 minutes
      if (job.status === 'completed' && job.completed_at) {
        const completedTime = new Date(job.completed_at);
        const timeDiff = now.getTime() - completedTime.getTime();
        const twoMinutesInMs = 2 * 60 * 1000;
        return timeDiff <= twoMinutesInMs;
      }
      
      return false;
    });
  };

  // Calculate distances when position or jobs change
  useEffect(() => {
    if (!jobsWithDistance.length) return;

    const filteredJobs = filterJobsByTime(jobsWithDistance);
    
    if (!position) {
      setJobsWithDistance(filteredJobs);
      return;
    }

    const jobsWithDist = filteredJobs
      .filter(job => job.latitude && job.longitude)
      .map(job => ({
        ...job,
        distance: calculateDistance(
          position.latitude,
          position.longitude,
          job.latitude!,
          job.longitude!
        )
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

    setJobsWithDistance(jobsWithDist);
  }, [position, jobsWithDistance]);

  // Auto-refresh to remove completed jobs after 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setJobsWithDistance(prev => filterJobsByTime(prev));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter jobs based on search and category
  const filteredJobs = jobsWithDistance.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           job.service_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(jobs.map(job => job.service_categories?.name).filter(Boolean)));

  const formatCurrency = (min?: number, max?: number, final?: number) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });

    if (final) {
      return formatter.format(final);
    } else if (min && max) {
      return `${formatter.format(min)}-${formatter.format(max)}`;
    } else if (min) {
      return `${formatter.format(min)}+`;
    }
    return 'A combinar';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (geoLoading || loading) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              Carregando trabalhos próximos...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (geoError) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Localização necessária:</strong> {geoError}
              <br />
              Por favor, permita o acesso à sua localização para ver os trabalhos próximos.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showKYCBanner={false}>
      <div className="flex flex-col h-full pb-24">
        {/* Header */}
        <div className="bg-background border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Descobrir Jobs</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="w-4 h-4 mr-2" />
                Mapa
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>

          <DiscoverFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
            resultCount={filteredJobs.length}
            userDistance={position ? formatDistance(0) : undefined}
          />
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <DiscoverMap
              jobs={filteredJobs}
              position={position}
              formatDistance={formatDistance}
            />
          ) : (
            /* List View */
            <div className="p-4 space-y-4 overflow-y-auto">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhum trabalho encontrado</h3>
                    <p>Tente ajustar seus filtros de busca</p>
                  </div>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{job.title}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          {job.proposal_count && job.proposal_count > 0 && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {job.proposal_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-lg text-primary">
                            {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
                          </div>
                          {job.distance && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {formatDistance(job.distance)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Propor
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}