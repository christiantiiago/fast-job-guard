import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, DollarSign, MessageSquare } from 'lucide-react';

interface Provider {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  rating_avg: number;
  rating_count: number;
  services: any[];
}

interface DirectProposalModalProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DirectProposalModal = ({ provider, isOpen, onClose, onSuccess }: DirectProposalModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposedPrice: '',
    estimatedHours: '',
    deadline: '',
    clientMessage: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-direct-proposal', {
        body: {
          providerId: provider.user_id,
          title: formData.title,
          description: formData.description,
          proposedPrice: parseFloat(formData.proposedPrice),
          estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
          deadline: formData.deadline || null,
          clientMessage: formData.clientMessage
        }
      });

      if (error) throw error;

      toast({
        title: "Proposta Enviada!",
        description: "Sua proposta foi enviada para o prestador. Você será notificado quando ele responder.",
      });

      setFormData({
        title: '',
        description: '',
        proposedPrice: '',
        estimatedHours: '',
        deadline: '',
        clientMessage: ''
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a proposta. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  if (!provider) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold">
                {provider.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-semibold">{provider.full_name}</div>
              <div className="text-sm text-muted-foreground">
                ⭐ {provider.rating_avg.toFixed(1)} ({provider.rating_count})
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Título do Serviço *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Instalação elétrica residencial"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição Detalhada *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva detalhadamente o que precisa ser feito..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="proposedPrice" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor Proposto *
              </Label>
              <Input
                id="proposedPrice"
                type="number"
                step="0.01"
                value={formData.proposedPrice}
                onChange={(e) => setFormData({ ...formData, proposedPrice: e.target.value })}
                placeholder="0,00"
                required
              />
              {formData.proposedPrice && (
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(formData.proposedPrice)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horas Estimadas
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="Ex: 8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prazo Desejado
            </Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientMessage">Mensagem Adicional</Label>
            <Textarea
              id="clientMessage"
              value={formData.clientMessage}
              onChange={(e) => setFormData({ ...formData, clientMessage: e.target.value })}
              placeholder="Alguma informação adicional que considera importante..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.description || !formData.proposedPrice}
              className="flex-1"
            >
              {loading ? 'Enviando...' : 'Enviar Proposta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};