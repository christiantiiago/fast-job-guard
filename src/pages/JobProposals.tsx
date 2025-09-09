import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, User, Star, DollarSign, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProposalNegotiation from '@/components/proposals/ProposalNegotiation';

interface ProposalWithProfile {
  id: string;
  provider_id: string;
  price: number;
  message: string;
  estimated_hours?: number;
  delivery_date?: string;
  status: string;
  created_at: string;
  provider_profile: {
    full_name?: string;
    avatar_url?: string;
    rating_avg?: number;
    rating_count?: number;
  };
}

interface JobData {
  id: string;
  title: string;
  client_id: string;
}

export default function JobProposals() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [proposals, setProposals] = useState<ProposalWithProfile[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<ProposalWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (id) {
      fetchJobAndProposals();
    }
  }, [id]);

  useEffect(() => {
    filterAndSortProposals();
  }, [proposals, searchTerm, sortBy, filterStatus]);

  const fetchJobAndProposals = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Fetch job data
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, client_id')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // Check if user can view proposals
      if (userRole === 'client' && jobData.client_id !== user?.id) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para ver as propostas deste trabalho.",
          variant: "destructive",
        });
        navigate('/jobs');
        return;
      }

      // Fetch proposals with provider profiles
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select(`
          *,
          profiles!proposals_provider_id_fkey (
            full_name,
            avatar_url,
            rating_avg,
            rating_count
          )
        `)
        .eq('job_id', id)
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      const proposalsWithProfiles = proposalsData?.map(proposal => ({
        ...proposal,
        provider_profile: proposal.profiles || {}
      })) || [];

      setProposals(proposalsWithProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as propostas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProposals = () => {
    let filtered = proposals;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(proposal =>
        proposal.provider_profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === filterStatus);
    }

    // Sort proposals
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'rating':
          return (b.provider_profile.rating_avg || 0) - (a.provider_profile.rating_avg || 0);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredProposals(filtered);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos detalhes
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Propostas Recebidas</h1>
              <p className="text-muted-foreground">{job?.title}</p>
            </div>
            <Badge variant="outline" className="text-sm w-fit">
              {filteredProposals.length} de {proposals.length} propostas
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por prestador ou mensagem..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Mais recentes</SelectItem>
                  <SelectItem value="price_low">Menor preço</SelectItem>
                  <SelectItem value="price_high">Maior preço</SelectItem>
                  <SelectItem value="rating">Melhor avaliação</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="accepted">Aceitas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Proposals List */}
        <div className="space-y-6">
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Tente ajustar os filtros para ver mais resultados.'
                    : 'Este trabalho ainda não recebeu propostas.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => (
              <div key={proposal.id} onClick={() => navigate(`/profile/${proposal.provider_id}`)} className="cursor-pointer">
                <ProposalNegotiation
                  proposal={proposal}
                  providerProfile={proposal.provider_profile}
                  jobId={id!}
                  isClient={userRole === 'client'}
                  onProposalUpdate={fetchJobAndProposals}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}