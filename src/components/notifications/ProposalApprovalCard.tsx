import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserLink } from '@/components/ui/user-link';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  Calendar, 
  User,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { useDirectProposals } from '@/hooks/useDirectProposals';
import { useToast } from '@/hooks/use-toast';

interface ProposalApprovalCardProps {
  data: {
    proposal_id: string;
    provider_id: string;
    provider_name: string;
    provider_avatar?: string;
    title: string;
    proposed_price: number;
    estimated_hours?: number;
    deadline?: string;
  };
  onClose?: () => void;
}

export function ProposalApprovalCard({ data, onClose }: ProposalApprovalCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { rejectProposal, approveAndCheckout } = useDirectProposals();
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'A combinar';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveAndCheckout(data.proposal_id);
      if (result.success && result.checkoutData) {
        // Navigate to checkout with the proposal data
        navigate('/checkout', { 
          state: { 
            proposalData: result.checkoutData 
          } 
        });
        onClose?.();
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível prosseguir com o pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectProposal(data.proposal_id, 'Cliente rejeitou a proposta');
      toast({
        title: "Proposta rejeitada",
        description: "O prestador foi notificado e bloqueado por 2 horas.",
      });
      onClose?.();
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

  return (
    <Card className="border-l-4 border-l-success">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={data.provider_avatar} />
              <AvatarFallback>
                {data.provider_name?.charAt(0) || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <CardTitle className="text-lg">{data.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Prestador: <UserLink userId={data.provider_id} name={data.provider_name} />
              </p>
            </div>
          </div>
          
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Proposta Aceita
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Proposal Details */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Final</p>
              <p className="font-semibold text-green-600">{formatCurrency(data.proposed_price)}</p>
            </div>
          </div>
          
          {data.estimated_hours && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="font-semibold">{data.estimated_hours}h</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">Prazo</p>
              <p className="font-semibold">{formatDate(data.deadline)}</p>
            </div>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{data.provider_name}</strong> aceitou sua proposta! 
            Revise os detalhes e prossiga com o pagamento para iniciar o trabalho.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="w-full bg-success hover:bg-success/90"
            size="lg"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Prosseguir com Pagamento ({formatCurrency(data.proposed_price)})
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeitar Prestador
          </Button>
          
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Ao rejeitar, o prestador será bloqueado por 2 horas para enviar novas propostas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}