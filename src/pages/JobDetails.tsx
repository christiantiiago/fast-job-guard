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
import { Calendar, MapPin, User, DollarSign, Clock, MessageSquare, Star, ArrowLeft, Handshake, TrendingUp, Award, Shield, Eye, CheckCircle2, Edit3, Send, X, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Map from '@/components/ui/map';
import ProposalNegotiation from '@/components/proposals/ProposalNegotiation';
import EnhancedJobActions from '@/components/jobs/EnhancedJobActions';
import { EscrowManager } from '@/components/escrow/EscrowManager';
import { JobCompletionButton } from '@/components/jobs/JobCompletionButton';
import { useProposalCooldown } from '@/hooks/useProposalCooldown';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { useJobProposalManager } from '@/hooks/useJobProposalManager';
import { ActiveProposalsPanel } from '@/components/proposals/ActiveProposalsPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const { deleteJob, reactivateJob } = useJobs();
  const { toast } = useToast();
  const { calculateFees, formatCurrency, getFeeDescription, isPremiumUser } = useFeeRules();
  const { canPropose, cooldownEnd, getCooldownTimeRemaining, recordRejection } = useProposalCooldown(id || '');
  const { sendNotification } = useRealTimeNotifications();
  const { canProposeToJob, withdrawProposal, rejectProposal, cancelJob, activeLocks } = useJobProposalManager();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [clientProfile, setClientProfile] = useState<JobProfile | null>(null);
  const [providerProfile, setProviderProfile] = useState<JobProfile | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalProfiles, setProposalProfiles] = useState<{[key: string]: JobProfile}>({});
  const [counterOffers, setCounterOffers] = useState<CounterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  
  // Proposal form state
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  
  // Check if current user is the client (properly handle loading states)
  const isClient = Boolean(user?.id && job?.client_id && user.id === job.client_id);

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
      console.log('🔍 Fetching job details for ID:', id);
      
      // Fetch job data with better error handling
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

      console.log('📝 Job query result:', { jobData, jobError });

      if (jobError) {
        console.error('❌ Error fetching job:', jobError);
        toast({
          title: "Erro no banco de dados",
          description: `Erro ao buscar trabalho: ${jobError.message}`,
          variant: "destructive",
        });
        navigate('/jobs');
        return;
      }

      if (!jobData) {
        console.warn('⚠️ No job data found for ID:', id);
        toast({
          title: "Trabalho não encontrado",
          description: "O trabalho solicitado não existe, foi removido ou você não tem permissão para visualizá-lo.",
          variant: "destructive",
        });
        navigate('/jobs');
        return;
      }

      console.log('✅ Job data loaded successfully:', jobData.title);
      setJob(jobData);

      // Fetch client profile separately
      if (jobData.client_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, rating_avg, rating_count')
          .eq('user_id', jobData.client_id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Error fetching client profile:', profileError);
        }

        if (profileData) {
          setClientProfile(profileData);
        }
      }

      // Fetch provider profile separately
      if (jobData.provider_id) {
        const { data: providerData, error: providerError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, rating_avg, rating_count')
          .eq('user_id', jobData.provider_id)
          .maybeSingle();

        if (providerError) {
          console.error('❌ Error fetching provider profile:', providerError);
        }

        if (providerData) {
          setProviderProfile(providerData);
        }
      }
    } catch (error) {
      console.error('💥 Unexpected error in fetchJobDetails:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao carregar o trabalho. Tente novamente.",
        variant: "destructive",
      });
      navigate('/jobs');
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

  const handleDeleteJob = async () => {
    if (!job) return;

    try {
      console.log('🗑️ Iniciando exclusão do job:', job.id);
      console.log('👤 Usuário atual:', user?.id);
      console.log('📝 Job cliente:', job.client_id);
      
      await deleteJob(job.id, 'Excluído pelo cliente');
      
      console.log('✅ Job excluído com sucesso');
      toast({
        title: "Trabalho excluído",
        description: "O trabalho foi excluído com sucesso.",
      });
      navigate('/jobs');
    } catch (error) {
      console.error('❌ Error deleting job:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o trabalho.",
        variant: "destructive",
      });
    }
  };

  const handleReactivateJob = async () => {
    if (!job) return;

    try {
      await reactivateJob(job.id);
      toast({
        title: "Trabalho reativado",
        description: "O trabalho foi reativado e está disponível novamente.",
      });
      // Refresh job details
      fetchJobDetails();
    } catch (error) {
      console.error('Error reactivating job:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reativar o trabalho.",
        variant: "destructive",
      });
    }
  };

  const handleDirectAccept = async () => {
    if (!job || !user) return;

    // Verificar se pode fazer proposta
    const { canPropose: canProposeToThisJob, reason } = canProposeToJob(job.id, job.status);
    if (!canProposeToThisJob && reason) {
      toast({
        title: "Não é possível aceitar",
        description: reason,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingProposal(true);

      // Calcular o valor exato com taxas
      const jobAmount = job.budget_max || job.budget_min || 0;
      const fees = calculateFees(jobAmount);

      const proposalData = {
        job_id: job.id,
        provider_id: user.id,
        price: jobAmount,
        message: `Aceito realizar este trabalho pelo valor proposto de ${formatCurrency(jobAmount)}.`,
        proposal_type: 'direct_accept',
        auto_accepted: false,
        status: 'sent' as const
      };

      const { data: proposalResult, error } = await supabase
        .from('proposals')
        .insert([proposalData])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Erro no banco de dados: ${error.message}`);
      }

      // Enviar notificação para o cliente
      await sendNotification(
        job.client_id,
        'job_proposal',
        'Nova Aceitação Direta!',
        `${user.email} aceitou seu trabalho "${job.title}" pelo valor de ${formatCurrency(jobAmount)}. Clique para avaliar.`,
        { jobId: job.id, proposalId: proposalResult.id, type: 'direct_accept', amount: jobAmount },
        3
      );

      toast({
        title: "Aceitação enviada!",
        description: "O cliente foi notificado e pode aprovar sua participação.",
      });

      // Atualizar locks locais
      setTimeout(() => {
        // Refresh para atualizar o estado
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('Error submitting direct accept:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a aceitação.",
        variant: "destructive",
      });
    } finally {
      setSubmittingProposal(false);
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

    // Verificar cooldown
    if (!canPropose) {
      const timeLeft = getCooldownTimeRemaining();
      toast({
        title: "Aguarde para propor novamente",
        description: timeLeft 
          ? `Você pode fazer uma nova proposta em ${timeLeft.hours}h ${timeLeft.minutes}m`
          : "Você precisa aguardar antes de fazer uma nova proposta.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se pode fazer proposta
    const { canPropose: canProposeToThisJob, reason } = canProposeToJob(job.id, job.status);
    if (!canProposeToThisJob && reason) {
      toast({
        title: "Não é possível fazer proposta",
        description: reason,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingProposal(true);

      const price = parseFloat(proposalPrice);
      const proposalData = {
        job_id: job.id,
        provider_id: user.id,
        price: price,
        message: proposalMessage,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : null,
        delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        proposal_type: 'custom'
      };

      const { data: proposalResult, error } = await supabase
        .from('proposals')
        .insert([proposalData])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Erro no banco de dados: ${error.message}`);
      }

      // Enviar notificação para o cliente
      await sendNotification(
        job.client_id,
        'job_proposal',
        'Nova Proposta Recebida!',
        `${user.email} enviou uma proposta para "${job.title}" por ${formatCurrency(price)}.`,
        { jobId: job.id, proposalId: proposalResult.id, type: 'custom', amount: price },
        2
      );

      toast({
        title: "Proposta enviada",
        description: "Sua proposta foi enviada com sucesso!",
      });

      // Reset form
      setProposalPrice('');
      setProposalMessage('');
      setEstimatedHours('');
      setDeliveryDate('');
      setShowProposalForm(false);

      // Refresh para atualizar o estado
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('Error in handleSubmitProposal:', error);
      toast({
        title: "Erro inesperado",
        description: error.message || "Ocorreu um erro ao enviar a proposta.",
        variant: "destructive",
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!job) return;

    try {
      // Release escrow payment
      const { data, error } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          escrowPaymentId: job.id, // This should be the actual escrow payment ID
          releaseType: 'manual'
        }
      });

      if (error) throw error;

      toast({
        title: "Trabalho concluído!",
        description: "O pagamento foi liberado para o prestador.",
      });

      // Update job status
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Refresh job details
      fetchJobDetails();
    } catch (error) {
      console.error('Error completing job:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir o trabalho.",
        variant: "destructive",
      });
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
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {job.status === 'in_progress' && userRole === 'client' && (
            <Button 
              onClick={handleCompleteJob}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluir Trabalho
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Job Header */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <CardTitle className="text-2xl md:text-3xl font-bold leading-tight">{job.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Publicado em {new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {job.deadline_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Prazo: {new Date(job.deadline_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                  </div>
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

            {/* Provider Proposal Form - Custom Proposal */}
            {userRole === 'provider' && job.status === 'open' && showProposalForm && (
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

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleSubmitProposal} 
                      disabled={submittingProposal}
                      className="flex-1"
                    >
                      {submittingProposal ? 'Enviando...' : 'Enviar Proposta'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowProposalForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Proposals Section for Clients - Hide when job is paid/in progress */}
            {userRole === 'client' && proposals.length > 0 && job.status === 'open' && (
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-green-50">
                  <CardHeader className="bg-gradient-to-r from-blue-100 to-green-100 rounded-t-lg border-b border-blue-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                          <MessageSquare className="h-6 w-6 text-white" />
                        </div>
                        <span>Propostas Recebidas ({proposals.length})</span>
                      </CardTitle>
                      {proposals.length > 10 && (
                        <Button 
                          onClick={() => navigate(`/jobs/${job.id}/proposals`)}
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Todas as Propostas
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="grid gap-6">
                      {proposals.slice(0, 10).map((proposal, index) => {
                        const providerProfile = proposalProfiles[proposal.provider_id];
                        
                        return (
                          <div 
                            key={proposal.id}
                            className="relative group"
                          >
                            <div className="absolute top-4 right-4 z-10">
                              <Badge className="bg-blue-600 text-white shadow-lg">
                                #{index + 1}
                              </Badge>
                            </div>
                            
                            <div 
                              className="cursor-pointer transform transition-all hover:scale-[1.02]"
                              onClick={() => navigate(`/profile/${proposal.provider_id}`)}
                            >
                              <div className="p-6 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-blue-100 hover:border-blue-300 transition-all shadow-lg hover:shadow-xl">
                                {/* Provider Header */}
                                <div className="flex items-center gap-4 mb-4">
                                  <Avatar className="h-16 w-16 ring-2 ring-blue-200">
                                    <AvatarImage src={providerProfile?.avatar_url} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                                      {providerProfile?.full_name?.charAt(0) || 'P'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                      {providerProfile?.full_name || 'Prestador Anônimo'}
                                    </h3>
                                    {providerProfile?.rating_avg && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star 
                                              key={star} 
                                              className={`h-4 w-4 ${
                                                star <= Math.round(providerProfile?.rating_avg || 0)
                                                  ? 'fill-yellow-400 text-yellow-400'
                                                  : 'text-gray-300'
                                              }`} 
                                            />
                                          ))}
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">
                                          {providerProfile?.rating_avg?.toFixed(1)} ({providerProfile?.rating_count} avaliações)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                                    {formatCurrency(proposal.price)}
                                  </Badge>
                                </div>
                                
                                {/* Proposal Preview */}
                                <div className="bg-white/80 p-4 rounded-lg border border-blue-100">
                                  <p className="text-gray-700 line-clamp-2 mb-2">
                                    {proposal.message}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    {proposal.estimated_hours && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {proposal.estimated_hours}h
                                      </div>
                                    )}
                                    {proposal.delivery_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(proposal.delivery_date).toLocaleDateString('pt-BR')}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <MessageSquare className="h-4 w-4" />
                                      Enviada em {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Full Proposal Details */}
                            <div 
                              className="mt-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ProposalNegotiation
                                proposal={proposal}
                                providerProfile={providerProfile}
                                jobId={job.id}
                                isClient={true}
                                onProposalUpdate={fetchProposals}
                                onProposalReject={rejectProposal}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {proposals.length > 10 && (
                      <div className="text-center py-4">
                        <Button 
                          onClick={() => navigate(`/jobs/${job.id}/proposals`)}
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Ver Todas as {proposals.length} Propostas
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Escrow Manager - Show when job has escrow payment or is waiting for approval */}
            {(job.status === 'in_progress' || job.status === 'completed' || job.status === 'waiting_approval') && (
              <EscrowManager 
                jobId={job.id} 
                isClient={userRole === 'client' && user?.id === job?.client_id} 
              />
            )}

            {/* Job Completion Button for Clients */}
            {userRole === 'client' && job.status === 'in_progress' && (
              <div className="mt-6">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Finalizar Trabalho
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-green-700 mb-4">
                      O trabalho está em andamento. Quando finalizar, marque como concluído para liberar o pagamento.
                    </p>
                    <JobCompletionButton 
                      jobId={job.id}
                      jobTitle={job.title}
                      onCompleted={() => {
                        toast({
                          title: "Trabalho concluído",
                          description: "O pagamento foi liberado para o prestador.",
                        });
                        fetchJobDetails();
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Provider Actions - Always visible for open jobs */}
            {userRole === 'provider' && job.status === 'open' && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Handshake className="h-6 w-6 text-primary" />
                    </div>
                    <span>Ações do Prestador</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {/* Check if can propose */}
                  {(() => {
                    const { canPropose: canProposeToThisJob, reason } = canProposeToJob(job.id, job.status);
                    
                    return !canProposeToThisJob && reason ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="font-medium text-amber-800">Restrição de Proposta</span>
                        </div>
                        <p className="text-sm text-amber-700">{reason}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button 
                          onClick={handleDirectAccept}
                          disabled={submittingProposal}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          {submittingProposal ? 'Processando...' : 'Aceitar Trabalho'}
                        </Button>
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted-foreground/20" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground font-medium">ou</span>
                          </div>
                        </div>

                        <Button 
                          onClick={() => setShowProposalForm(!showProposalForm)}
                          variant="outline" 
                          className="w-full py-3 border-2 border-primary/30 hover:border-primary hover:bg-primary/10"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {showProposalForm ? 'Ocultar Formulário' : 'Fazer Proposta Personalizada'}
                        </Button>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}


            {/* Provider Actions for In Progress Jobs */}
            {userRole === 'provider' && job.status === 'in_progress' && job.provider_id === user?.id && (
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 bg-green-200 rounded-lg">
                      <MapPin className="h-6 w-6 text-green-700" />
                    </div>
                    <span className="text-green-800">Trabalho em Andamento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-3">
                    {/* Ir até o cliente */}
                    <Button 
                      onClick={() => {
                        if (job.latitude && job.longitude) {
                          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
                          window.open(mapsUrl, '_blank');
                          
                          // Enviar notificação que está a caminho
                          const sendOnTheWayNotification = async () => {
                            try {
                              await supabase.from('notifications').insert({
                                user_id: job.client_id,
                                type: 'provider_on_way',
                                title: 'Prestador a Caminho',
                                message: `O prestador está a caminho para realizar o trabalho "${job.title}".`,
                                data: { jobId: job.id }
                              });
                              toast({
                                title: "Cliente notificado",
                                description: "O cliente foi avisado que você está a caminho!",
                              });
                            } catch (error) {
                              console.error('Error sending notification:', error);
                            }
                          };
                          sendOnTheWayNotification();
                        } else {
                          toast({
                            title: "Localização não disponível",
                            description: "As coordenadas do trabalho não foram encontradas.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                    >
                      <MapPin className="h-5 w-5 mr-2" />
                      Ir até o Cliente (GPS)
                    </Button>
                    
                    {/* Trabalho concluído */}
                    <Button 
                      onClick={() => {
                        const confirmCompletion = async () => {
                          try {
                            // Atualizar status do job
                            const { error: jobError } = await supabase
                              .from('jobs')
                              .update({ status: 'delivered' })
                              .eq('id', job.id);

                            if (jobError) throw jobError;

                            // Enviar notificação para o cliente
                            await supabase.from('notifications').insert({
                              user_id: job.client_id,
                              type: 'job_completion_request',
                              title: 'Trabalho Concluído',
                              message: `O prestador marcou o trabalho "${job.title}" como concluído. Por favor, confirme para liberar o pagamento.`,
                              data: { jobId: job.id }
                            });

                            toast({
                              title: "Trabalho marcado como concluído!",
                              description: "O cliente foi notificado para confirmar e liberar o pagamento.",
                            });

                            // Refresh para atualizar o estado
                            fetchJobDetails();
                          } catch (error) {
                            console.error('Error completing job:', error);
                            toast({
                              title: "Erro",
                              description: "Não foi possível marcar o trabalho como concluído.",
                              variant: "destructive",
                            });
                          }
                        };
                        confirmCompletion();
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Marcar como Concluído
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cliente Actions for Jobs Awaiting Completion */}
            {userRole === 'client' && job.status === 'awaiting_completion' && job.client_id === user?.id && (
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
                <CardHeader className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 bg-amber-200 rounded-lg">
                      <Clock className="h-6 w-6 text-amber-700" />
                    </div>
                    <span className="text-amber-800">Aguardando Confirmação</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 mb-4">
                    <p className="text-amber-800 text-sm">
                      O prestador marcou este trabalho como concluído. Por favor, confirme se o serviço foi realizado satisfatoriamente para liberar o pagamento.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button 
                      onClick={async () => {
                        try {
                          // Liberar pagamento escrow
                          const { data: escrowData } = await supabase
                            .from('escrow_payments')
                            .select('id')
                            .eq('job_id', job.id)
                            .eq('status', 'held')
                            .single();

                          if (escrowData) {
                            const { error: releaseError } = await supabase.functions.invoke('release-escrow-payment', {
                              body: { escrowPaymentId: escrowData.id, releaseType: 'manual' }
                            });
                            
                            if (releaseError) throw releaseError;
                          }

                          // Atualizar status do job
                          const { error: jobError } = await supabase
                            .from('jobs')
                            .update({ status: 'completed' })
                            .eq('id', job.id);

                          if (jobError) throw jobError;

                          // Notificar prestador
                          await supabase.from('notifications').insert({
                            user_id: job.provider_id,
                            type: 'payment_released',
                            title: 'Pagamento Liberado',
                            message: `O cliente confirmou a conclusão do trabalho "${job.title}". Seu pagamento foi liberado!`,
                            data: { jobId: job.id }
                          });

                          toast({
                            title: "Trabalho confirmado!",
                            description: "O pagamento foi liberado para o prestador.",
                          });

                          fetchJobDetails();
                        } catch (error) {
                          console.error('Error confirming completion:', error);
                          toast({
                            title: "Erro",
                            description: "Não foi possível confirmar a conclusão.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Confirmar Conclusão e Liberar Pagamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Actions - Only show for clients */}
            {isClient && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Ações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.status === 'open' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <X className="h-4 w-4 mr-2" />
                          Cancelar Trabalho
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar Trabalho</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja cancelar este trabalho? 
                            Todos os prestadores interessados serão notificados.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Manter Trabalho</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelJob(job.id, 'Cancelado pelo cliente')}>
                            Sim, Cancelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Delete Job Button - Available for all statuses except completed */}
                  {job.status !== 'completed' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Trabalho
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Trabalho</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este trabalho permanentemente? 
                            Esta ação não pode ser desfeita e o trabalho será removido 
                            do mapa e das listas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteJob} className="bg-red-600 hover:bg-red-700">
                            Sim, Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Reactivate Job Button - Only for cancelled jobs */}
                  {job.status === 'cancelled' && (
                    <Button 
                      onClick={handleReactivateJob}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reativar Trabalho
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/jobs/${job.id}/edit`)}
                    disabled={job.status !== 'open'}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar Trabalho
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Provider Info - Show when user is client and job has provider */}
            {isClient && job.provider_id && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="h-5 w-5" />
                    Prestador do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {!providerProfile && loading ? (
                    <div className="flex items-center gap-4 animate-pulse">
                      <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-4 cursor-pointer group hover:bg-muted/30 p-2 rounded-lg transition-all"
                      onClick={() => navigate(`/profile/${job.provider_id}`)}
                    >
                      <Avatar className="h-16 w-16 ring-2 ring-accent/20">
                        <AvatarImage src={providerProfile?.avatar_url} />
                        <AvatarFallback className="bg-accent/10 text-accent text-lg">
                          {providerProfile?.full_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg group-hover:text-accent transition-colors">
                          {providerProfile?.full_name || 'Prestador'}
                        </h4>
                        {providerProfile?.rating_avg && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-3 w-3 ${
                                    star <= Math.round(providerProfile?.rating_avg || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {providerProfile?.rating_avg?.toFixed(1)} ({providerProfile?.rating_count} avaliações)
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 group-hover:text-accent/80 transition-colors">
                          Clique para ver perfil completo
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Client Info - Show when user is provider and job has client */}
            {!isClient && job.client_id && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cliente do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {!clientProfile && loading ? (
                    <div className="flex items-center gap-4 animate-pulse">
                      <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-4 cursor-pointer group hover:bg-muted/30 p-2 rounded-lg transition-all"
                      onClick={() => navigate(`/profile/${job.client_id}`)}
                    >
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                        <AvatarImage src={clientProfile?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {clientProfile?.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                          {clientProfile?.full_name || 'Cliente'}
                        </h4>
                        {clientProfile?.rating_avg && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-3 w-3 ${
                                    star <= Math.round(clientProfile?.rating_avg || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {clientProfile?.rating_avg?.toFixed(1)} ({clientProfile?.rating_count} avaliações)
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 group-hover:text-primary/80 transition-colors">
                          Clique para ver perfil completo
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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