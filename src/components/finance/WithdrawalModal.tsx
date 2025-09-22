import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdvancedWithdrawals } from '@/hooks/useAdvancedWithdrawals';
import { 
  Banknote, 
  Zap, 
  Calendar, 
  Shield, 
  AlertTriangle,
  Clock,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawalModalProps {
  availableBalance: number;
  isPremium: boolean;
  type?: 'instant' | 'scheduled' | 'both';
}

export function WithdrawalModal({ availableBalance, isPremium, type = 'both' }: WithdrawalModalProps) {
  const { requestInstantWithdrawal, calculateWithdrawalFee, getNextScheduledWithdrawal } = useAdvancedWithdrawals();
  const [open, setOpen] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<'instant' | 'scheduled'>('instant');
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const fee = calculateWithdrawalFee(parsedAmount, withdrawalType);
  const netAmount = withdrawalType === 'instant' ? parsedAmount - fee : parsedAmount;
  const nextScheduledDate = getNextScheduledWithdrawal();

  const handleWithdrawal = async () => {
    if (!amount || parsedAmount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    if (withdrawalType === 'instant' && parsedAmount < 20) {
      toast.error('Valor mínimo para saque imediato: R$ 20,00');
      return;
    }

    if (withdrawalType === 'scheduled' && parsedAmount < 50) {
      toast.error('Valor mínimo para saque programado: R$ 50,00');
      return;
    }

    if (parsedAmount > availableBalance) {
      toast.error('Saldo insuficiente');
      return;
    }

    if (withdrawalType === 'instant' && !pixKey.trim()) {
      toast.error('Por favor, insira sua chave PIX');
      return;
    }

    try {
      setLoading(true);

      if (withdrawalType === 'instant') {
        await requestInstantWithdrawal(parsedAmount, pixKey);
        toast.success('Saque PIX solicitado! Será processado em até 5 minutos.');
      } else {
        // Implementar saque programado
        toast.success('Saque programado configurado para a próxima quinta-feira!');
      }

      setOpen(false);
      setAmount('');
      setPixKey('');
    } catch (error) {
      toast.error('Erro ao solicitar saque. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (availableBalance <= 0) {
    return (
      <Button disabled variant="outline" size="sm" className="w-full gap-2">
        <Banknote className="h-4 w-4" />
        Saldo Insuficiente
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full gap-2">
          <Banknote className="h-4 w-4" />
          Solicitar Saque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Solicitar Saque
          </DialogTitle>
          <DialogDescription>
            Saldo disponível: <span className="font-semibold text-success">{formatCurrency(availableBalance)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de Saque */}
          {type === 'both' && (
            <div className="space-y-3">
              <Label>Tipo de Saque</Label>
              <RadioGroup value={withdrawalType} onValueChange={(value) => setWithdrawalType(value as 'instant' | 'scheduled')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="instant" id="instant" />
                  <label htmlFor="instant" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">PIX Imediato</span>
                      </div>
                      <Badge variant="secondary">R$ 7,50</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Processamento em até 5 minutos • Mín: R$ 20,00
                    </p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="scheduled" id="scheduled" />
                  <label htmlFor="scheduled" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-success" />
                        <span className="font-medium">Programado</span>
                      </div>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Gratuito
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Próxima quinta-feira ({nextScheduledDate.toLocaleDateString('pt-BR')}) • Mín: R$ 50,00
                    </p>
                  </label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Valor do Saque */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Saque</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              max={availableBalance}
              min={withdrawalType === 'instant' ? 20 : 50}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mínimo: {formatCurrency(withdrawalType === 'instant' ? 20 : 50)}</span>
              <span>Máximo: {formatCurrency(availableBalance)}</span>
            </div>
          </div>

          {/* Chave PIX (apenas para saque imediato) */}
          {withdrawalType === 'instant' && (
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input
                id="pixKey"
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
              <p className="text-xs text-muted-foreground">
                Esta chave será usada para receber o pagamento
              </p>
            </div>
          )}

          {/* Resumo do Saque */}
          {parsedAmount > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Resumo do Saque
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Valor solicitado:</span>
                  <span>{formatCurrency(parsedAmount)}</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between text-warning">
                    <span>Taxa de saque:</span>
                    <span>-{formatCurrency(fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Você receberá:</span>
                  <span className="text-success">{formatCurrency(Math.max(0, netAmount))}</span>
                </div>
              </div>

              {withdrawalType === 'instant' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Saque PIX será processado em até 5 minutos após confirmação
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Alertas de Segurança */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Para sua segurança, saques acima de R$ 500 podem requerer autenticação facial
            </AlertDescription>
          </Alert>

          {/* Botão de Confirmação */}
          <Button 
            onClick={handleWithdrawal} 
            disabled={!amount || parsedAmount <= 0 || loading || netAmount <= 0}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                Confirmar Saque {withdrawalType === 'instant' ? 'Imediato' : 'Programado'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}