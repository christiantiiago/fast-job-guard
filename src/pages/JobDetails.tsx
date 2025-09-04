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
    
    const minStandardFees = calculateFees(minAmount, true); // Force standard
    const maxStandardFees = calculateFees(maxAmount, true);
    const minPremiumFees = calculateFees(minAmount, false); // Use user's plan
    const maxPremiumFees = calculateFees(maxAmount, false);
    
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
                      placeholder="Descreva sua proposta, experiência e como vai executar o trabalho..."
                      rows={4}
                    />
                  </div>

                  {proposalPrice && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Cálculo de Taxas</h4>
                      <div className="text-sm space-y-1">
                        {(() => {
                          const fees = calculateFees(parseFloat(proposalPrice));
                          return (
                            <>
                              <div className="flex justify-between">
                                <span>Valor do serviço:</span>
                                <span>{formatCurrency(fees.subtotal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{getFeeDescription()}:</span>
                                <span>{formatCurrency(fees.platformFee)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Taxa de processamento:</span>
                                <span>{formatCurrency(fees.processingFee)}</span>
                              </div>
                              <Separator className="my-2" />
                              <div className="flex justify-between font-medium">
                                <span>Você receberá:</span>
                                <span>{formatCurrency(fees.subtotal - fees.platformFee)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleSubmitProposal}
                    disabled={submittingProposal || !proposalPrice || !proposalMessage}
                    className="w-full"
                  >
                    {submittingProposal ? 'Enviando...' : 'Enviar Proposta'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Proposals with Negotiation */}
            {userRole === 'client' && proposals.length > 0 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Handshake className="h-5 w-5" />
                      Propostas Recebidas ({proposals.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {proposals.map((proposal) => {
                        const providerProfile = proposalProfiles[proposal.provider_id];
                        return (
                          <ProposalNegotiation
                            key={proposal.id}
                            proposal={proposal}
                            providerProfile={providerProfile}
                            jobId={job.id}
                            isClient={true}
                            onProposalUpdate={fetchProposals}
                          />
                        );
                      })}
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

            {/* Budget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    {job.budget_min === job.budget_max 
                      ? formatCurrency(job.budget_min)
                      : `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}`
                    }
                    {job.budget_min === job.budget_max && (
                      <Badge variant="secondary" className="ml-2 text-xs">Preço fixo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Prestadores podem negociar valores através de propostas
                  </p>
                </div>

                {budgetFees && (
                  <div className="space-y-3">
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-2">Taxas da Plataforma</h4>
                      <div className="space-y-2 text-xs">
                        <div className="bg-muted p-2 rounded">
                          <div className="font-medium text-green-600 mb-1">
                            Plano Premium (3,5%) {isPremiumUser && '✓ Seu plano'}
                          </div>
                          <div className="flex justify-between">
                            <span>Total com taxas:</span>
                            <span>
                              {budgetFees.premium.min.total !== budgetFees.premium.max.total ? (
                                `${formatCurrency(budgetFees.premium.min.total)} - ${formatCurrency(budgetFees.premium.max.total)}`
                              ) : (
                                formatCurrency(budgetFees.premium.min.total)
                              )}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-muted p-2 rounded">
                          <div className="font-medium text-blue-600 mb-1">
                            Plano Padrão (5%) {!isPremiumUser && '← Seu plano atual'}
                          </div>
                          <div className="flex justify-between">
                            <span>Total com taxas:</span>
                            <span>
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
                        <div className="mt-2">
                          <Button variant="outline" size="sm" className="w-full">
                            Assinar Premium e Economizar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category */}
            {job.service_categories && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge 
                      style={{ 
                        backgroundColor: job.service_categories.color ? job.service_categories.color + '20' : '#e5e5e5',
                        color: job.service_categories.color || '#666666'
                      }}
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