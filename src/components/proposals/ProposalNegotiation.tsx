import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { 
  MessageSquare, 
  DollarSign, 
  Clock, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  ArrowUpDown,
  Handshake,
  Star,
  AlertTriangle,
  Send,
  Edit3,
  TrendingUp,
  Shield,
  CreditCard
} from 'lucide-react';

interface ProposalData {
  id: string;
  provider_id: string;
  price: number;
  message: string;
  estimated_hours?: number;
  delivery_date?: string;
  status: string;
  created_at: string;
  counter_offers?: CounterOffer[];
}

interface CounterOffer {
  id: string;
  proposal_id: string;
  offered_by: string; // 'client' or 'provider'
  price: number;
  message: string;
  delivery_date?: string;
  estimated_hours?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  created_at: string;
}

interface ProviderProfile {
  full_name?: string;
  avatar_url?: string;
  rating_avg?: number;
  rating_count?: number;
}

interface ProposalNegotiationProps {
  proposal: ProposalData;
  providerProfile?: ProviderProfile | null;
  jobId: string;
  isClient: boolean;
  onProposalUpdate: () => void;
}

const ProposalNegotiation = ({ 
  proposal, 
  providerProfile, 
  jobId, 
  isClient, 
  onProposalUpdate 
}: ProposalNegotiationProps) => {
  const { toast } = useToast();
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Counter offer form
  const [counterPrice, setCounterPrice] = useState(proposal.price.toString());
  const [counterMessage, setCounterMessage] = useState('');
  const [counterHours, setCounterHours] = useState(proposal.estimated_hours?.toString() || '');
  const [counterDelivery, setCounterDelivery] = useState(proposal.delivery_date || '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleAcceptProposal = () => {
    if (!isClient) return;
    setShowPaymentModal(true);
  };

  const handleRejectProposal = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'rejected' })
        .eq('id', proposal.id);

      if (error) throw error;

      toast({
        title: "Proposta rejeitada",
        description: "A proposta foi rejeitada.",
      });

      onProposalUpdate();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a proposta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCounterOffer = async () => {
    if (!counterMessage.trim() || !counterPrice) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos o preço e uma mensagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create the counter offer record
      const counterOfferData = {
        proposal_id: proposal.id,
        offered_by: isClient ? 'client' : 'provider',
        price: parseFloat(counterPrice),
        message: counterMessage,
        estimated_hours: counterHours ? parseInt(counterHours) : null,
        delivery_date: counterDelivery ? new Date(counterDelivery).toISOString() : null,
        status: 'pending'
      };

      const { error: counterError } = await supabase
        .from('counter_offers')
        .insert([counterOfferData]);

      if (counterError) throw counterError;

      toast({
        title: "Contraproposta enviada!",
        description: "Sua contraproposta foi enviada com sucesso.",
      });

      setShowCounterOffer(false);
      setCounterMessage('');
      onProposalUpdate();
    } catch (error) {
      console.error('Error submitting counter offer:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a contraproposta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Enviada', icon: Send },
      accepted: { color: 'bg-green-100 text-green-800', label: 'Aceita', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejeitada', icon: XCircle },
      countered: { color: 'bg-purple-100 text-purple-800', label: 'Contraofertas', icon: ArrowUpDown },
      negotiating: { color: 'bg-yellow-100 text-yellow-800', label: 'Negociando', icon: Handshake }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const calculatePriceDifference = () => {
    const newPrice = parseFloat(counterPrice);
    const difference = newPrice - proposal.price;
    const percentage = ((difference / proposal.price) * 100).toFixed(1);
    
    return {
      amount: Math.abs(difference),
      percentage: Math.abs(parseFloat(percentage)),
      isIncrease: difference > 0
    };
  };

  const priceDiff = calculatePriceDifference();

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={providerProfile?.avatar_url} />
              <AvatarFallback>
                {providerProfile?.full_name?.charAt(0) || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {providerProfile?.full_name || 'Prestador'}
                </CardTitle>
                {providerProfile?.rating_avg && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{providerProfile?.rating_avg?.toFixed(1)}</span>
                    <span>({providerProfile?.rating_count})</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Proposta enviada em {formatDate(proposal.created_at)}
              </div>
            </div>
          </div>
          
          {getStatusBadge(proposal.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Proposal Details */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Preço</p>
              <p className="font-semibold text-green-600">{formatCurrency(proposal.price)}</p>
            </div>
          </div>
          
          {proposal.estimated_hours && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="font-semibold">{proposal.estimated_hours}h</p>
              </div>
            </div>
          )}
          
          {proposal.delivery_date && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Entrega</p>
                <p className="font-semibold">{formatDate(proposal.delivery_date)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Proposal Message */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem da Proposta
          </h4>
          <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-l-primary/20">
            <p className="text-muted-foreground whitespace-pre-wrap">{proposal.message}</p>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-4">
          {isClient && proposal.status === 'sent' && (
            <>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleAcceptProposal}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Contratar Serviço
                </Button>
                
                <Dialog open={showCounterOffer} onOpenChange={setShowCounterOffer}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 sm:flex-none">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Fazer Contraproposta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5" />
                        Nova Contraproposta
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Price comparison */}
                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p><strong>Proposta atual:</strong> {formatCurrency(proposal.price)}</p>
                            <p><strong>Sua contraproposta:</strong> {formatCurrency(parseFloat(counterPrice) || 0)}</p>
                            {priceDiff.amount > 0 && (
                              <p className={`text-sm ${priceDiff.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                                {priceDiff.isIncrease ? 'Aumento' : 'Redução'} de {formatCurrency(priceDiff.amount)} ({priceDiff.percentage}%)
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="counter-price">Novo Preço *</Label>
                          <Input
                            id="counter-price"
                            type="number"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            placeholder="R$ 0,00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="counter-hours">Horas Estimadas</Label>
                          <Input
                            id="counter-hours"
                            type="number"
                            value={counterHours}
                            onChange={(e) => setCounterHours(e.target.value)}
                            placeholder="Ex: 8"
                            min="1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="counter-delivery">Nova Data de Entrega</Label>
                        <Input
                          id="counter-delivery"
                          type="date"
                          value={counterDelivery}
                          onChange={(e) => setCounterDelivery(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="counter-message">Mensagem da Contraproposta *</Label>
                        <Textarea
                          id="counter-message"
                          value={counterMessage}
                          onChange={(e) => setCounterMessage(e.target.value)}
                          placeholder="Explique os motivos da sua contraproposta..."
                          rows={4}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleSubmitCounterOffer}
                          disabled={loading}
                          className="flex-1"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Contraproposta
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCounterOffer(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={handleRejectProposal}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1 sm:flex-none"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Dica:</strong> Negocie sempre de forma respeitosa. Contrapropostas permitem chegar a um acordo que beneficie ambas as partes.
                </AlertDescription>
              </Alert>
            </>
          )}

          {!isClient && proposal.status === 'sent' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aguardando resposta do cliente. Você será notificado sobre aceite, rejeição ou contraproposta.
              </AlertDescription>
            </Alert>
          )}

          {proposal.status === 'accepted' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Proposta aceita!</strong> O trabalho foi iniciado e você pode acompanhar o progresso no chat.
              </AlertDescription>
            </Alert>
          )}

          {proposal.status === 'rejected' && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Esta proposta foi rejeitada pelo cliente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            proposal={proposal}
            providerProfile={providerProfile}
            jobId={jobId}
            jobTitle="Trabalho" // This should come from props in real implementation
            onPaymentSuccess={() => {
              onProposalUpdate();
              toast({
                title: "Contratação realizada!",
                description: "Contrato gerado e chat liberado para comunicação.",
              });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ProposalNegotiation;