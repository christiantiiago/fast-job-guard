import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  DollarSign, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  Briefcase
} from 'lucide-react';
import { DirectProposal, useDirectProposals } from '@/hooks/useDirectProposals';
import { useAuth } from '@/hooks/useAuth';

interface DirectProposalCardProps {
  proposal: DirectProposal;
}

export function DirectProposalCard({ proposal }: DirectProposalCardProps) {
  const { user, userRole } = useAuth();
  const { acceptProposal, rejectProposal, confirmStart } = useDirectProposals();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      accepted: { label: 'Aceita', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-800', icon: XCircle },
      blocked: { label: 'Bloqueado', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleAccept = async () => {
    setLoading(true);
    await acceptProposal(proposal.id);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await rejectProposal(proposal.id, rejectReason);
    setLoading(false);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handleConfirmStart = async () => {
    setLoading(true);
    await confirmStart(proposal.id);
    setLoading(false);
  };

  const isProvider = userRole === 'provider' && user?.id === proposal.provider_id;
  const isClient = userRole === 'client' && user?.id === proposal.client_id;

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={
                  isClient ? proposal.provider_profile?.avatar_url : proposal.client_profile?.avatar_url
                } />
                <AvatarFallback>
                  {isClient 
                    ? (proposal.provider_profile?.full_name?.charAt(0) || <User className="h-6 w-6" />)
                    : (proposal.client_profile?.full_name?.charAt(0) || <User className="h-6 w-6" />)
                  }
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <CardTitle className="text-lg">{proposal.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isClient ? 'De: ' : 'Para: '}
                  <span className="font-medium">
                    {isClient 
                      ? (proposal.provider_profile?.full_name || 'Prestador')
                      : (proposal.client_profile?.full_name || 'Cliente')
                    }
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(proposal.created_at)}
                </p>
              </div>
            </div>
            
            {getStatusBadge(proposal.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Proposal Details */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Preço</p>
                <p className="font-semibold text-green-600">{formatCurrency(proposal.proposed_price)}</p>
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
            
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Prazo</p>
                <p className="font-semibold">{formatDate(proposal.deadline)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Descrição do Trabalho
            </h4>
            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-l-primary/20">
              <p className="text-muted-foreground whitespace-pre-wrap">{proposal.description}</p>
            </div>
          </div>

          {/* Client Message */}
          {proposal.client_message && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem do Cliente
              </h4>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-l-blue-200">
                <p className="text-muted-foreground whitespace-pre-wrap">{proposal.client_message}</p>
              </div>
            </div>
          )}

          {/* Provider Response */}
          {proposal.provider_response && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Resposta do Prestador
              </h4>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-l-green-200">
                <p className="text-muted-foreground whitespace-pre-wrap">{proposal.provider_response}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t">
            {isProvider && proposal.status === 'pending' && (
              <div className="flex gap-3">
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aceitar Proposta
                </Button>
                <Button
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            )}

            {isClient && proposal.status === 'waiting_client_approval' && (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Proposta aceita!</strong> {proposal.provider_profile?.full_name || 'O prestador'} aceitou sua proposta. 
                    Você receberá uma notificação para aprovar e prosseguir com o pagamento.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {proposal.status === 'rejected' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta proposta foi rejeitada.
                  {proposal.provider_response && (
                    <div className="mt-2">
                      <strong>Motivo:</strong> {proposal.provider_response}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isProvider && proposal.status === 'waiting_client_approval' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Proposta aceita! Aguardando o cliente aprovar e efetuar o pagamento.
                </AlertDescription>
              </Alert>
            )}

            {proposal.status === 'confirmed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Trabalho confirmado!</strong> O pagamento foi efetuado e o trabalho pode ser iniciado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ao rejeitar esta proposta, você será bloqueado de receber novas propostas por 2 horas.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="reject-reason">Motivo da rejeição (opcional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleReject}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                Confirmar Rejeição
              </Button>
              <Button
                onClick={() => setShowRejectModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}