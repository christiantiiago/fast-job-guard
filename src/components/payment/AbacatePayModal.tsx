import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AbacatePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  paymentType: 'premium' | 'boost' | 'job' | 'direct_proposal';
  paymentData?: any;
}

export const AbacatePayModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  description, 
  paymentType,
  paymentData = {}
}: AbacatePayModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const generateQRCode = async () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.cpf) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-abacatepay-payment', {
        body: {
          amount,
          description,
          paymentType,
          customer: formData,
          paymentData
        }
      });

      if (error) {
        throw error;
      }

      // Verificar se o QR code é uma string base64 válida
      let qrCodeUrl = data.qrCode;
      if (qrCodeUrl && !qrCodeUrl.startsWith('data:image/')) {
        qrCodeUrl = `data:image/png;base64,${qrCodeUrl}`;
      }
      
      setQrCode(qrCodeUrl);
      toast({
        title: "QR Code gerado!",
        description: "Escaneie o código para realizar o pagamento",
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR Code. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQrCode(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      cpf: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento via PIX
          </DialogTitle>
          <DialogDescription>
            {description} - R$ {amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!qrCode ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>

              <Button 
                onClick={generateQRCode} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Gerar QR Code PIX
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={qrCode} 
                  alt="QR Code PIX" 
                  className="w-full max-w-64 mx-auto"
                  onError={(e) => {
                    console.error('Erro ao carregar QR Code:', qrCode);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Escaneie o código QR acima com o app do seu banco para realizar o pagamento
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Fechar
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    navigator.clipboard.writeText(qrCode || '');
                    toast({
                      title: "Copiado!",
                      description: "Código PIX copiado para a área de transferência"
                    });
                  }}
                  className="flex-1"
                >
                  Copiar Código
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};