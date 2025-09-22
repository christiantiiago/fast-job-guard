import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Shield,
  Fingerprint,
  Bell,
  Smartphone,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle,
  Settings,
  Lock,
  Key,
  Edit3,
  Phone,
  User
} from 'lucide-react';

interface SecuritySettingsProps {
  userRole?: string;
}

export const SecuritySettings = ({ userRole }: SecuritySettingsProps) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Modals state
  const [changePhoneModal, setChangePhoneModal] = useState(false);
  const [changeUsernameModal, setChangeUsernameModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  
  // Form states
  const [newPhone, setNewPhone] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleBiometricToggle = async (enabled: boolean) => {
    try {
      if (enabled && 'navigator' in window && 'credentials' in navigator) {
        // Check if WebAuthn is supported
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: { name: "JobFast" },
            user: {
              id: new Uint8Array(16),
              name: "user@example.com",
              displayName: "User"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            }
          }
        });
        
        if (credential) {
          setBiometricEnabled(enabled);
          toast.success('Autenticação biométrica ativada com sucesso!');
        }
      } else if (!enabled) {
        setBiometricEnabled(false);
        toast.success('Autenticação biométrica desativada');
      } else {
        toast.error('Seu dispositivo não suporta autenticação biométrica');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      toast.error('Erro ao configurar autenticação biométrica');
    }
  };

  const handlePhoneChange = async () => {
    if (!newPhone.trim()) {
      toast.error('Digite o novo número de telefone');
      return;
    }
    
    // Simulate API call
    toast.success('Solicitação de alteração de telefone enviada para análise');
    setChangePhoneModal(false);
    setNewPhone('');
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) {
      toast.error('Digite o novo nome de usuário');
      return;
    }
    
    // Simulate API call
    toast.success('Solicitação de alteração de nome de usuário enviada para análise');
    setChangeUsernameModal(false);
    setNewUsername('');
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    
    // Simulate API call
    toast.success('Senha alterada com sucesso!');
    setChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogoutAllDevices = async () => {
    toast.success('Logout realizado em todos os dispositivos');
  };

  return (
    <div className="space-y-6">
      {/* Account Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Alterações de Conta
          </CardTitle>
          <CardDescription>
            Solicite alterações em informações sensíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Dialog open={changePhoneModal} onOpenChange={setChangePhoneModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Phone className="mr-2 h-4 w-4" />
                  Alterar Telefone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Número de Telefone</DialogTitle>
                  <DialogDescription>
                    Sua solicitação será analisada e você receberá uma confirmação por email.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newPhone">Novo número de telefone</Label>
                    <Input
                      id="newPhone"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePhoneChange} className="flex-1">
                      Solicitar Alteração
                    </Button>
                    <Button variant="outline" onClick={() => setChangePhoneModal(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={changeUsernameModal} onOpenChange={setChangeUsernameModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Alterar Nome de Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Nome de Usuário</DialogTitle>
                  <DialogDescription>
                    Sua solicitação será analisada e você receberá uma confirmação por email.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newUsername">Novo nome de usuário</Label>
                    <Input
                      id="newUsername"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="novo_usuario"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUsernameChange} className="flex-1">
                      Solicitar Alteração
                    </Button>
                    <Button variant="outline" onClick={() => setChangeUsernameModal(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={changePasswordModal} onOpenChange={setChangePasswordModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Lock className="mr-2 h-4 w-4" />
                  Alterar Senha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Senha</DialogTitle>
                  <DialogDescription>
                    Digite sua senha atual e a nova senha desejada.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Senha atual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePasswordChange} className="flex-1">
                      Alterar Senha
                    </Button>
                    <Button variant="outline" onClick={() => setChangePasswordModal(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações de Segurança
          </CardTitle>
          <CardDescription>
            Configure suas preferências de segurança e autenticação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Biometric Authentication */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                <span className="font-medium">Autenticação Biométrica</span>
                <Badge variant="secondary" className="text-xs">BETA</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Use sua digital ou Face ID para fazer login
              </p>
            </div>
            <Switch
              checked={biometricEnabled}
              onCheckedChange={handleBiometricToggle}
            />
          </div>

          <Separator />

          {/* Login Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Alertas de Login</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba alertas quando sua conta for acessada
              </p>
            </div>
            <Switch
              checked={loginAlerts}
              onCheckedChange={setLoginAlerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificações
          </CardTitle>
          <CardDescription>
            Gerencie como você recebe notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium">Notificações Push</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba notificações no seu dispositivo
              </p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Notificações por Email</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba atualizações importantes por email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Notificações por SMS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba alertas críticos por SMS
              </p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciamento de Sessão
          </CardTitle>
          <CardDescription>
            Gerencie suas sessões ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sessão Atual</h4>
                  <p className="text-sm text-muted-foreground">
                    Chrome • São Paulo, Brasil • Agora
                  </p>
                </div>
                <Badge variant="secondary">Ativo</Badge>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleLogoutAllDevices}
              className="w-full justify-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Desconectar de Todos os Dispositivos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};