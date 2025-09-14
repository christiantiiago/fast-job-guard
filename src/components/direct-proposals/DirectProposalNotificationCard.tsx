import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useDirectProposals } from '@/hooks/useDirectProposals';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  Calendar,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

interface DirectProposalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    proposal_id: string;
    provider_id: string;
    provider_name: string;
    provider_avatar?: string;
    title: string;
    proposed_price: number;
    estimated_hours?: number;
    deadline?: string;
    action_url?: string;
  };
  created_at: string;
  is_read: boolean;
}

interface DirectProposalNotificationCardProps {
  notification: DirectProposalNotification;
  onUpdate: () => void;
}

export function DirectProposalNotificationCard({ notification, onUpdate }: DirectProposalNotificationCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { approveAndCheckout, rejectProposal } = useDirectProposals();
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveAndCheckout(notification.data.proposal_id);
      
      if (result.success && result.checkoutData) {
        // Navigate to checkout with proposal data
        navigate('/direct-proposal-checkout', { 
          state: { 
            type: 'direct_proposal',
            ...result.checkoutData 
          } 
        });
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Você será direcionado para finalizar o pagamento.",
        });
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a aprovação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      onUpdate();
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const success = await rejectProposal(notification.data.proposal_id, "Proposta rejeitada pelo cliente");
      
      if (success) {
        toast({
          title: "Proposta rejeitada",
          description: "A proposta foi rejeitada com sucesso.",
        });
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a proposta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      onUpdate();
    }
  };

  if (notification.type !== 'direct_proposal_accepted') {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-green-500 bg-green-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={notification.data.provider_avatar} />
              <AvatarFallback>
                {notification.data.provider_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <CardTitle className="text-lg text-green-700">
                {notification.title}
              </CardTitle>
              <p className="text-sm text-green-600">
                {notification.data.provider_name} • {formatDate(notification.created_at)}
              </p>
            </div>
          </div>
          
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aguardando Aprovação
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Proposal Details */}
        <div className="bg-white p-4 rounded-lg border space-y-3">
          <h4 className="font-semibold">{notification.data.title}</h4>
          
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Preço</p>
                <p className="font-semibold text-green-600">
                  {formatCurrency(notification.data.proposed_price)}
                </p>
              </div>
            </div>
            
            {notification.data.estimated_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="font-semibold">{notification.data.estimated_hours}h</p>
                </div>
              </div>
            )}
            
            {notification.data.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="font-semibold">{formatDate(notification.data.deadline)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ação Necessária:</strong> O prestador aceitou sua proposta direta. 
            Revise os detalhes e confirme para prosseguir com o pagamento seguro.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Aprovar e Pagar
          </Button>
          
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}