import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, AlertTriangle, CheckCircle2, X, Eye } from 'lucide-react';
import { useJobProposalManager, ProposalLock } from '@/hooks/useJobProposalManager';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useNavigate } from 'react-router-dom';
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

interface ActiveProposalsPanelProps {
  className?: string;
}

export const ActiveProposalsPanel: React.FC<ActiveProposalsPanelProps> = ({ className }) => {
  const { activeLocks, loading, withdrawProposal } = useJobProposalManager();
  const { formatCurrency } = useFeeRules();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Minhas Propostas Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeLocks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Propostas Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">
              Você não tem propostas ativas no momento.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => navigate('/jobs')}
            >
              Ver Trabalhos Disponíveis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleWithdrawProposal = async (proposalId: string) => {
    await withdrawProposal(proposalId, 'Proposta retirada pelo prestador');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Minhas Propostas Ativas ({activeLocks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Você tem {activeLocks.length} proposta(s) pendente(s). 
          Aguarde a resposta ou cancele para poder fazer novas propostas.
        </div>

        <div className="space-y-3">
          {activeLocks.map((lock) => (
            <div key={lock.id} className="p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="text-xs">
                    Proposta Pendente
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/jobs/${lock.job_id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-sm">
                  <div className="font-medium">Trabalho ID: {lock.job_id.slice(0, 8)}...</div>
                  <div className="text-muted-foreground">
                    Enviada em: {new Date(lock.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                {lock.can_withdraw && (
                  <div className="pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar Proposta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar Proposta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja cancelar esta proposta? 
                            O cliente será notificado e você poderá fazer uma nova proposta posteriormente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Manter Proposta</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleWithdrawProposal(lock.id)}>
                            Sim, Cancelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />
        
        <div className="text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Você pode ter no máximo 3 propostas ativas simultaneamente.
        </div>
      </CardContent>
    </Card>
  );
};