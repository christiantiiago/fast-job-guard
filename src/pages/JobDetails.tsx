import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, User, DollarSign, Clock, MessageSquare, Star, ArrowLeft, Handshake, TrendingUp, Award, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Map from '@/components/ui/map';
import ProposalNegotiation from '@/components/proposals/ProposalNegotiation';
import EnhancedJobActions from '@/components/jobs/EnhancedJobActions';

interface JobProfile {
  full_name?: string;
  avatar_url?: string;
  rating_avg?: number;
  rating_count?: number;
}

interface JobCategory {
  name: string;
  color?: string;
  icon_name?: string;
}

interface JobAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

interface JobData {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  images?: string[];
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  deadline_at?: string;
  client_id: string;
  provider_id?: string;
  service_categories?: JobCategory;
  addresses?: JobAddress;
}

interface Proposal {
  id: string;
  provider_id: string;
  price: number;
  message: string;
  estimated_hours?: number;
  delivery_date?: string;
  status: string;
  created_at: string;
}

interface CounterOffer {
  id: string;
  proposal_id: string;
  offered_by: string;
  price: number;
  message: string;
  delivery_date?: string;
  estimated_hours?: number;
  status: string;
  created_at: string;
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const { calculateFees, formatCurrency, getFeeDescription, isPremiumUser } = useFeeRules();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [clientProfile, setClientProfile] = useState<JobProfile | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalProfiles, setProposalProfiles] = useState<{[key: string]: JobProfile}>({});
  const [counterOffers, setCounterOffers] = useState<CounterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  
  // Proposal form state
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  useEffect(() => {
    if (id) {
      fetchJobDetails();
      if (userRole === 'client') {
        fetchProposals();
        fetchCounterOffers();
      }
    }
  }, [id, userRole]);

  const fetchJobDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Fetch job data
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          service_categories (name, color, icon_name),
          addresses (
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zipcode
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (jobError) {
        console.error('Error fetching job:', jobError);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do trabalho.",
          variant: "destructive",
        });
        navigate('/jobs');
        return;
      }

      if (!jobData) {
        toast({
          title: "Trabalho não encontrado",
          description: "O trabalho solicitado não existe ou foi removido.",
          variant: "destructive",
        });
        navigate('/jobs');
        return;
      }

      setJob(jobData);

      // Fetch client profile separately
      if (jobData.client_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, rating_avg, rating_count')
          .eq('user_id', jobData.client_id)
          .maybeSingle();

        if (profileData) {
          setClientProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Error in fetchJobDetails:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao carregar o trabalho.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    if (!id) return;

    try {
      // Fetch proposals
      const { data: proposalsData, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching proposals:', error);
        return;
      }

      if (proposalsData && proposalsData.length > 0) {
        setProposals(proposalsData);

        // Fetch profiles for each proposal
        const providerIds = proposalsData.map(p => p.provider_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, rating_avg, rating_count')
          .in('user_id', providerIds);

        if (profilesData) {
          const profilesMap: {[key: string]: JobProfile} = {};
          profilesData.forEach(profile => {
            profilesMap[profile.user_id] = profile;
          });
          setProposalProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error('Error in fetchProposals:', error);
    }
  };

  const fetchCounterOffers = async () => {
    if (!id || !proposals.length) return;

    try {
      const proposalIds = proposals.map(p => p.id);
      const { data: counterOffersData, error } = await supabase
        .from('counter_offers')
        .select('*')
        .in('proposal_id', proposalIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching counter offers:', error);
        return;
      }

      if (counterOffersData) {
        setCounterOffers(counterOffersData);
      }
    } catch (error) {
      console.error('Error in fetchCounterOffers:', error);
    }
  };

  const handleSubmitProposal = async () => {
    if (!job || !user || !proposalPrice || !proposalMessage) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o preço e a mensagem da proposta.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingProposal(true);

      const proposalData = {
        job_id: job.id,
        provider_id: user.id,
        price: parseFloat(proposalPrice),
        message: proposalMessage,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : null,
        delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
      };

      const { error } = await supabase
        .from('proposals')
        .insert([proposalData]);

      if (error) {
        console.error('Error submitting proposal:', error);
        toast({
          title: "Erro",
          description: "Não foi possível enviar a proposta. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Proposta enviada",
        description: "Sua proposta foi enviada com sucesso!",
      });

      // Reset form
      setProposalPrice('');
      setProposalMessage('');
      setEstimatedHours('');
      setDeliveryDate('');

      // Refresh proposals if client
      if (userRole === 'client') {
        fetchProposals();
      }
    } catch (error) {
      console.error('Error in handleSubmitProposal:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao enviar a proposta.",
        variant: "destructive",
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
      draft: 'Rascunho',
      open: 'Aberto',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  const formatAddress = (address?: JobAddress) => {
    if (!address) return 'Endereço não informado';
    
    const parts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const calculateBudgetFees = () => {
    if (!job?.budget_min && !job?.budget_max) return null;
    
    const minAmount = job.budget_min || job.budget_max || 0;
    const maxAmount = job.budget_max || job.budget_min || 0;
    
    // Standard plan - force 7.5% fee 
    const minStandardFees = calculateFees(minAmount, true);
    const maxStandardFees = calculateFees(maxAmount, true);
    
    // Premium plan - force 5% fee by NOT forcing standard
    const minPremiumFees = { 
      ...calculateFees(minAmount, false), 
      platformFee: minAmount * 0.05 // Force 5% for premium simulation
    };
    const maxPremiumFees = { 
      ...calculateFees(maxAmount, false), 
      platformFee: maxAmount * 0.05 // Force 5% for premium simulation
    };
    
    return {
      standard: { min: minStandardFees, max: maxStandardFees },
      premium: { min: minPremiumFees, max: maxPremiumFees }
    };
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

  if (!job) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Trabalho não encontrado</h1>
            <Button onClick={() => navigate('/jobs')}>
              Voltar aos trabalhos
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const budgetFees = calculateBudgetFees();

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(job.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {job.deadline_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Prazo: {new Date(job.deadline_at).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(job.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Descrição</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </div>

                {job.requirements && (
                  <div>
                    <h3 className="font-medium mb-2">Requisitos</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                )}

                {job.images && job.images.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Imagens</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {job.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Imagem ${index + 1}`}
                          className="rounded-lg object-cover aspect-square border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            {(job.latitude && job.longitude) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {formatAddress(job.addresses)}
                    </p>
                    <Map
                      center={[job.longitude, job.latitude]}
                      zoom={15}
                      className="h-64 rounded-lg"
                      markers={[{
                        latitude: job.latitude,
                        longitude: job.longitude,
                        title: job.title,
                        description: job.addresses?.street || 'Local do trabalho'
                      }]}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Provider Proposal Form */}
            {userRole === 'provider' && job.status === 'open' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Enviar Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Preço da Proposta *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={proposalPrice}
                        onChange={(e) => setProposalPrice(e.target.value)}
                        placeholder="R$ 0,00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hours">Horas Estimadas</Label>
                      <Input
                        id="hours"
                        type="number"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        placeholder="Ex: 8"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="delivery">Data de Entrega</Label>
                    <Input
                      id="delivery"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Mensagem da Proposta *</Label>
                    <Textarea
                      id="message"
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      placeholder="Descreva sua experiência, abordagem e por que você é a melhor escolha..."
                      rows={6}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitProposal} 
                    disabled={submittingProposal}
                    className="w-full"
                  >
                    {submittingProposal ? 'Enviando...' : 'Enviar Proposta'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Received Proposals - Enhanced for Clients */}
            {userRole === 'client' && proposals.length > 0 && (
              <div className="space-y-6">
                <Card className="border-2 border-gradient-to-r from-blue-200 to-green-200 bg-gradient-to-r from-blue-50 to-green-50">
                  <CardHeader className="bg-gradient-to-r from-blue-100 to-green-100 rounded-t-lg border-b border-blue-200">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-blue-700" />
                      </div>
                      <span>Propostas Recebidas ({proposals.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="grid gap-6">
                      {proposals.map((proposal, index) => {
                        const providerProfile = proposalProfiles[proposal.provider_id];
                        const proposalCounterOffers = counterOffers.filter(co => co.proposal_id === proposal.id);
                        
                        return (
                          <div 
                            key={proposal.id}
                            className="relative p-6 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-blue-100 hover:border-blue-300 transition-all shadow-lg hover:shadow-xl"
                          >
                            <div className="absolute top-4 right-4">
                              <Badge className="bg-blue-600 text-white">
                                Proposta #{index + 1}
                              </Badge>
                            </div>
                            
                            <ProposalNegotiation
                              proposal={{...proposal, counter_offers: proposalCounterOffers}}
                              providerProfile={providerProfile}
                              jobId={job.id}
                              isClient={true}
                              onProposalUpdate={fetchProposals}
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Award className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900 mb-1">💡 Dica para escolher a melhor proposta</h4>
                          <p className="text-sm text-blue-700">
                            Considere não apenas o preço, mas também a avaliação do prestador, tempo de entrega 
                            e qualidade da proposta apresentada.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enhanced Job Actions for Providers - Sidebar */}
            {userRole === 'provider' && job.status === 'open' && (
              <EnhancedJobActions 
                job={job} 
                userRole={userRole} 
                onUpdate={fetchJobDetails}
              />
            )}
            
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={clientProfile?.avatar_url} />
                    <AvatarFallback>
                      {clientProfile?.full_name?.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{clientProfile?.full_name || 'Cliente'}</h4>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{clientProfile?.rating_avg?.toFixed(1) || '0.0'}</span>
                      <span>({clientProfile?.rating_count || 0})</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget - Enhanced */}
            <Card className="border-2 border-gradient-to-br from-primary/20 to-accent/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg border-b border-primary/10">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-xl text-gray-900">Orçamento do Projeto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {job.budget_min === job.budget_max 
                      ? formatCurrency(job.budget_min)
                      : `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}`
                    }
                  </div>
                  {job.budget_min === job.budget_max && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 mb-2">
                      <Shield className="w-3 h-3 mr-1" />
                      Preço Fixo
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground">
                    💰 Prestadores podem negociar valores através de propostas
                  </p>
                </div>

                {budgetFees && (
                  <div className="space-y-4">
                    <Separator className="bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    <div>
                      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 text-gray-900">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Simulação de Taxas
                      </h4>
                      <div className="space-y-3">
                        {/* Premium Plan */}
                        <div className={`relative p-4 rounded-xl border-2 transition-all ${
                          isPremiumUser 
                            ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50' 
                            : 'border-green-200 bg-green-50 hover:border-green-300'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-green-200 rounded-lg">
                                <Award className="h-4 w-4 text-green-700" />
                              </div>
                              <span className="font-semibold text-green-800">Plano Premium</span>
                              <Badge className="bg-green-600 text-white text-xs">5% de taxa</Badge>
                              {isPremiumUser && (
                                <Badge className="bg-emerald-600 text-white text-xs">✓ Seu plano</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700">Total com taxas:</span>
                            <span className="font-bold text-lg text-green-800">
                              {budgetFees.premium.min.total !== budgetFees.premium.max.total ? (
                                `${formatCurrency(budgetFees.premium.min.total)} - ${formatCurrency(budgetFees.premium.max.total)}`
                              ) : (
                                formatCurrency(budgetFees.premium.min.total)
                              )}
                            </span>
                          </div>
                        </div>
                        
                        {/* Standard Plan */}
                        <div className={`relative p-4 rounded-xl border-2 transition-all ${
                          !isPremiumUser 
                            ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50' 
                            : 'border-blue-200 bg-blue-50'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-200 rounded-lg">
                                <User className="h-4 w-4 text-blue-700" />
                              </div>
                              <span className="font-semibold text-blue-800">Plano Padrão</span>
                              <Badge className="bg-blue-600 text-white text-xs">7,5% de taxa</Badge>
                              {!isPremiumUser && (
                                <Badge className="bg-orange-600 text-white text-xs">← Seu plano atual</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">Total com taxas:</span>
                            <span className="font-bold text-lg text-blue-800">
                              {budgetFees.standard.min.total !== budgetFees.standard.max.total ? (
                                `${formatCurrency(budgetFees.standard.min.total)} - ${formatCurrency(budgetFees.standard.max.total)}`
                              ) : (
                                formatCurrency(budgetFees.standard.min.total)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isPremiumUser && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-2 text-amber-800 mb-2">
                              <TrendingUp className="h-5 w-5" />
                              <span className="font-semibold">Economize 2,5% em taxas!</span>
                            </div>
                            <p className="text-sm text-amber-700 mb-3">
                              Upgrade para Premium e pague menos taxas em todos os seus projetos
                            </p>
                            <Button 
                              onClick={() => navigate('/premium')}
                              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                            >
                              <Award className="w-4 h-4 mr-2" />
                              Assinar Premium e Economizar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category */}
            {job.service_categories && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge 
                      style={{ 
                        backgroundColor: job.service_categories.color || '#3b82f6',
                        color: 'white'
                      }}
                      className="text-lg px-4 py-2"
                    >
                      {job.service_categories.name}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}