import { useState, useEffect } from 'react';
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
  const [pixCopyPasteCode, setPixCopyPasteCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [autoCheckInterval, setAutoCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Chave única para localStorage
  const storageKey = `pix_payment_${paymentType}_${amount}_${Date.now()}`;

  // Carregar dados do localStorage ao abrir modal
  useEffect(() => {
    if (isOpen) {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          const expirationTime = new Date(parsedData.expiresAt).getTime();
          const now = new Date().getTime();
          
          // Verificar se ainda não expirou
          if (expirationTime > now) {
            setFormData(parsedData.formData);
            setQrCode(parsedData.qrCode);
            setPixCopyPasteCode(parsedData.pixCopyPasteCode);
            setPaymentId(parsedData.paymentId);
            setExpiresAt(parsedData.expiresAt);
            
            toast({
              title: "PIX Ativo Restaurado",
              description: "Seus dados de pagamento foram restaurados",
            });
          } else {
            // Limpar dados expirados
            localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.error('Erro ao carregar dados salvos:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [isOpen, storageKey, toast]);

  // Salvar dados no localStorage
  const saveToLocalStorage = (data: any) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  };

  // Auto-verificação de pagamento
  useEffect(() => {
    if (paymentId && !paymentConfirmed && isOpen) {
      const interval = setInterval(async () => {
        await checkPaymentStatus(true); // silent check
      }, 10000); // Verificar a cada 10 segundos
      
      setAutoCheckInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [paymentId, paymentConfirmed, isOpen]);

  // Timer effect para expiração do QR Code
  useEffect(() => {
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = new Date().getTime();
      const initialTimeLeft = Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
      
      if (initialTimeLeft > 0) {
        setTimeLeft(initialTimeLeft);
        
        const interval = setInterval(() => {
          const now = new Date().getTime();
          const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
          
          setTimeLeft(remaining);
          
          if (remaining <= 0) {
            clearInterval(interval);
            setQrCode(null);
            setPixCopyPasteCode(null);
            setTimeLeft(null);
            toast({
              title: "QR Code expirado",
              description: "O código PIX expirou. Gere um novo código para continuar.",
              variant: "destructive"
            });
          }
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [expiresAt, toast]);

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

      console.log('AbacatePay function response:', data, error);

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Erro ao gerar PIX');
      }

      if (!data?.success) {
        console.error('Payment creation failed:', data);
        throw new Error(data?.error || 'Erro ao processar pagamento');
      }

      // Verificar se recebemos o QR code e PIX code
      const qrCodeBase64 = data.qrCodeBase64;
      const pixCode = data.pixCopyPasteCode || data.brCode;
      console.log('Payment data received:', { 
        qrCodeBase64: !!qrCodeBase64, 
        pixCode: !!pixCode,
        paymentId: data.paymentId,
        debugInfo: data.debugInfo,
        expiresAt: data.expiresAt,
        fullData: data
      });

      if (!qrCodeBase64 && !pixCode) {
        throw new Error('QR Code e código PIX não foram gerados corretamente');
      }

      // Configurar QR code (imagem)
      let qrCodeUrl = '';
      if (qrCodeBase64) {
        qrCodeUrl = qrCodeBase64;
        if (qrCodeUrl && !qrCodeUrl.startsWith('data:image/')) {
          qrCodeUrl = `data:image/png;base64,${qrCodeUrl}`;
        }
        setQrCode(qrCodeUrl);
      }
      
      // Salvar código PIX para copia e cola e data de expiração
      setPixCopyPasteCode(pixCode);
      setPaymentId(data.paymentId);
      setExpiresAt(data.expiresAt);
      
      // Salvar no localStorage para persistência
      saveToLocalStorage({
        formData,
        qrCode: qrCodeUrl,
        pixCopyPasteCode: pixCode,
        paymentId: data.paymentId,
        expiresAt: data.expiresAt,
        amount,
        description,
        paymentType
      });
      
      console.log('PIX Code gerado:', {
        pixCode: pixCode,
        paymentId: data.paymentId,
        expiresAt: data.expiresAt
      });
      
      toast({
        title: "QR Code gerado!",
        description: "Escaneie o código ou copie o PIX para realizar o pagamento",
      });
    } catch (error) {
      console.error('Erro detalhado ao gerar QR Code:', {
        error: error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Erro ao gerar QR Code",
        description: error instanceof Error ? error.message : "Não foi possível gerar o QR Code. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (silent = false) => {
    if (!paymentId) return;
    
    if (!silent) setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-abacatepay-payment', {
        body: { paymentId }
      });

      if (error) throw error;

      if (data.isPaid) {
        setPaymentConfirmed(true);
        // Limpar localStorage quando pagamento confirmado
        localStorage.removeItem(storageKey);
        // Para auto-verificação
        if (autoCheckInterval) {
          clearInterval(autoCheckInterval);
          setAutoCheckInterval(null);
        }
        
        if (!silent) {
          toast({
            title: "Pagamento confirmado!",
            description: "Seu pagamento foi processado com sucesso!",
          });
        }
      } else if (!silent) {
        toast({
          title: "Pagamento não confirmado",
          description: "O pagamento ainda não foi processado. Tente novamente em alguns instantes.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      if (!silent) {
        toast({
          title: "Erro",
          description: "Não foi possível verificar o status do pagamento. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    // Não limpar localStorage aqui - manter dados para persistência
    if (autoCheckInterval) {
      clearInterval(autoCheckInterval);
      setAutoCheckInterval(null);
    }
    onClose();
  };

  const clearAllData = () => {
    setQrCode(null);
    setPixCopyPasteCode(null);
    setPaymentId(null);
    setTimeLeft(null);
    setPaymentConfirmed(false);
    setExpiresAt(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      cpf: ''
    });
    localStorage.removeItem(storageKey);
    if (autoCheckInterval) {
      clearInterval(autoCheckInterval);
      setAutoCheckInterval(null);
    }
  };

  const handlePaymentSuccess = () => {
    clearAllData();
    onClose();
    // Recarregar a página para atualizar os dados
    setTimeout(() => {
      window.location.reload();
    }, 500);
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
          {paymentConfirmed ? (
            <div className="text-center space-y-6 py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Pagamento Confirmado!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Seu pagamento de R$ {amount.toFixed(2)} foi processado com sucesso.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-green-800 mb-1">Próximos passos:</p>
                  <p className="text-green-700">
                    {paymentType === 'boost' ? 
                      'Seu job foi impulsionado e receberá mais visibilidade!' :
                      'Seu pagamento foi confirmado e o processo será iniciado.'
                    }
                  </p>
                </div>
              </div>
              <Button onClick={handlePaymentSuccess} className="w-full">
                Continuar
              </Button>
            </div>
          ) : !qrCode ? (
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
              {timeLeft !== null && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-800">
                    ⏰ Código expira em: <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                  </p>
                </div>
              )}
              
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
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Escaneie o código QR acima ou copie o código PIX abaixo:
                </p>
                {pixCopyPasteCode && (
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Código PIX:</span>
                      <span className="text-xs text-gray-500">
                        {pixCopyPasteCode.length} caracteres
                      </span>
                    </div>
                    <p className="text-xs font-mono break-all text-gray-700 mb-2 max-h-20 overflow-y-auto">
                      {pixCopyPasteCode}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>💡 Dica: Cole este código no aplicativo do seu banco</div>
                      <div className="font-medium text-green-600">
                        💰 Valor: R$ {amount.toFixed(2)}
                      </div>
                      {paymentId && (
                        <div className="text-gray-400">
                          🔑 ID: {paymentId}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      if (pixCopyPasteCode) {
                        navigator.clipboard.writeText(pixCopyPasteCode);
                        toast({
                          title: "Copiado!",
                          description: "Código PIX copiado para a área de transferência"
                        });
                      } else {
                        toast({
                          title: "Erro",
                          description: "Código PIX não disponível",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="flex-1"
                    disabled={!pixCopyPasteCode}
                  >
                    Copiar Código PIX
                  </Button>
                  <Button 
                    onClick={() => checkPaymentStatus(false)}
                    disabled={checkingPayment}
                    className="flex-1"
                  >
                    {checkingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Já Paguei"
                    )}
                  </Button>
                </div>
                <Button variant="outline" onClick={handleClose} className="w-full">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};