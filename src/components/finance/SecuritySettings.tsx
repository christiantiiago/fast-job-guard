import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  Smartphone,
  Eye,
  Clock,
  MapPin,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';

export function SecuritySettings() {
  const [facialAuthEnabled, setFacialAuthEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSecurityLogs, setShowSecurityLogs] = useState(false);

  const handleEnableFacialAuth = () => {
    toast.success('Autenticação facial ativada com sucesso!');
    setFacialAuthEnabled(true);
  };

  const handleEnable2FA = () => {
    toast.success('Autenticação de dois fatores ativada!');
    setTwoFactorEnabled(true);
  };

  const securityLogs = [
    {
      id: 1,
      action: 'Saque solicitado',
      amount: 'R$ 250,00',
      date: '2024-11-20 14:30',
      location: 'São Paulo, SP',
      status: 'approved',
      device: 'iPhone 14 Pro'
    },
    {
      id: 2,
      action: 'Login realizado',
      date: '2024-11-20 09:15',
      location: 'São Paulo, SP',
      status: 'approved',
      device: 'Desktop Chrome'
    },
    {
      id: 3,
      action: 'Tentativa de login',
      date: '2024-11-19 22:45',
      location: 'Rio de Janeiro, RJ',
      status: 'blocked',
      device: 'Android Unknown'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Configurações de Segurança */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Autenticação Facial
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Proteja saques acima de R$ 500 com reconhecimento facial
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ativar para Saques</p>
                <p className="text-sm text-muted-foreground">
                  Obrigatório para valores altos
                </p>
              </div>
              <Switch 
                checked={facialAuthEnabled}
                onCheckedChange={setFacialAuthEnabled}
              />
            </div>
            
            {!facialAuthEnabled && (
              <Button onClick={handleEnableFacialAuth} className="w-full gap-2">
                <Camera className="h-4 w-4" />
                Configurar Agora
              </Button>
            )}

            {facialAuthEnabled && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Autenticação facial configurada e ativa
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Autenticação Dupla
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Adicione uma camada extra de segurança com SMS ou app
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SMS + Email</p>
                <p className="text-sm text-muted-foreground">
                  Receba códigos por SMS e email
                </p>
              </div>
              <Switch 
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
            </div>
            
            {!twoFactorEnabled && (
              <Button onClick={handleEnable2FA} variant="outline" className="w-full gap-2">
                <Fingerprint className="h-4 w-4" />
                Ativar 2FA
              </Button>
            )}

            {twoFactorEnabled && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Autenticação dupla ativa no seu número
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Políticas de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Políticas de Segurança Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-success/10 rounded">
                <Shield className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Monitoramento 24/7</p>
                <p className="text-xs text-muted-foreground">
                  Todas as transações são monitoradas por IA
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-success/10 rounded">
                <Clock className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Timeout de Sessão</p>
                <p className="text-xs text-muted-foreground">
                  Logout automático após 30min de inatividade
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-success/10 rounded">
                <MapPin className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Detecção de Localização</p>
                <p className="text-xs text-muted-foreground">
                  Alertas para acessos de novos dispositivos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-1 bg-warning/10 rounded">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-medium text-sm">Limite de Tentativas</p>
                <p className="text-xs text-muted-foreground">
                  Bloqueio após 5 tentativas de login incorretas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs de Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Atividade de Segurança
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Ver Detalhes</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Log de Atividades de Segurança</DialogTitle>
                  <DialogDescription>
                    Histórico detalhado de ações relacionadas à segurança da sua conta
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{log.action}</p>
                          {log.amount && (
                            <Badge variant="outline">{log.amount}</Badge>
                          )}
                          <Badge 
                            variant={log.status === 'approved' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {log.status === 'approved' ? 'Aprovado' : 'Bloqueado'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{log.date}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.location}
                          </span>
                          <span>{log.device}</span>
                        </div>
                      </div>
                      {log.status === 'approved' ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{log.action}</p>
                    {log.amount && (
                      <Badge variant="outline" className="text-xs">{log.amount}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{log.date} • {log.location}</p>
                </div>
                {log.status === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}