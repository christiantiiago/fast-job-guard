import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings,
  Database,
  Shield,
  Mail,
  Bell,
  Globe,
  Key,
  Server,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import { useState } from 'react';

interface SystemConfig {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  email_verification_required: boolean;
  kyc_verification_required: boolean;
  max_file_size_mb: number;
  session_timeout_minutes: number;
  rate_limit_requests_per_minute: number;
  backup_retention_days: number;
  log_retention_days: number;
}

export default function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    registration_enabled: true,
    email_verification_required: true,
    kyc_verification_required: true,
    max_file_size_mb: 10,
    session_timeout_minutes: 480,
    rate_limit_requests_per_minute: 60,
    backup_retention_days: 30,
    log_retention_days: 90
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Aqui você salvaria as configurações no banco
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular salvamento
      
      toast({
        title: "Configurações salvas",
        description: "As configurações do sistema foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      // Simular backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Backup iniciado",
        description: "O backup do sistema foi iniciado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no backup",
        description: "Ocorreu um erro ao iniciar o backup.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">
              Gerencie configurações globais e recursos da plataforma
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBackup} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Backup
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Tudo
            </Button>
          </div>
        </div>

        {/* Status do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Online</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Último reinício: 2h atrás
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">247</div>
              <p className="text-xs text-muted-foreground">
                +12% desde ontem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uso de Recursos</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">68%</div>
              <p className="text-xs text-muted-foreground">
                CPU e Memória
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Configuração */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>
                  Configurações básicas da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Modo de Manutenção</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar modo de manutenção para atualizações
                    </p>
                  </div>
                  <Switch
                    checked={config.maintenance_mode}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, maintenance_mode: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Novos Registros</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que novos usuários se registrem
                    </p>
                  </div>
                  <Switch
                    checked={config.registration_enabled}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, registration_enabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-file-size">Tamanho Máximo de Arquivo (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    value={config.max_file_size_mb}
                    onChange={(e) => 
                      setConfig(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Timeout de Sessão (minutos)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={config.session_timeout_minutes}
                    onChange={(e) => 
                      setConfig(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Configurações relacionadas à segurança e verificação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Verificação de Email Obrigatória</Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir verificação de email para novos usuários
                    </p>
                  </div>
                  <Switch
                    checked={config.email_verification_required}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, email_verification_required: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">KYC Obrigatório</Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir verificação KYC para prestadores
                    </p>
                  </div>
                  <Switch
                    checked={config.kyc_verification_required}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, kyc_verification_required: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Rate Limit (requests/minuto)</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={config.rate_limit_requests_per_minute}
                    onChange={(e) => 
                      setConfig(prev => ({ ...prev, rate_limit_requests_per_minute: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Alterações nas configurações de segurança podem afetar o acesso dos usuários. 
                    Teste cuidadosamente antes de aplicar em produção.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Configurações de Email
                </CardTitle>
                <CardDescription>
                  Configure provedores de email e templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email-provider">Provedor de Email</Label>
                  <Select defaultValue="sendgrid">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                      <SelectItem value="smtp">SMTP Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-email">Email Remetente</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="noreply@jobfast.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-name">Nome do Remetente</Label>
                  <Input
                    id="from-name"
                    placeholder="Job Fast"
                  />
                </div>

                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Testar Configuração de Email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Configurações de Notificações
                </CardTitle>
                <CardDescription>
                  Configure tipos de notificações e canais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notificações Push</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações push para aplicativo móvel
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notificações por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações importantes por email
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notificações SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações críticas por SMS
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipos de Notificação Ativados</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Novo Job</Badge>
                    <Badge>Proposta Recebida</Badge>
                    <Badge>Pagamento</Badge>
                    <Badge>KYC</Badge>
                    <Badge>Sistema</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup e Recuperação
                </CardTitle>
                <CardDescription>
                  Configure backups automáticos e retenção de dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="backup-retention">Retenção de Backup (dias)</Label>
                  <Input
                    id="backup-retention"
                    type="number"
                    value={config.backup_retention_days}
                    onChange={(e) => 
                      setConfig(prev => ({ ...prev, backup_retention_days: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-retention">Retenção de Logs (dias)</Label>
                  <Input
                    id="log-retention"
                    type="number"
                    value={config.log_retention_days}
                    onChange={(e) => 
                      setConfig(prev => ({ ...prev, log_retention_days: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  <Label>Backups Recentes</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">backup_2024_01_22.sql</p>
                        <p className="text-sm text-muted-foreground">22/01/2024 03:00</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">backup_2024_01_21.sql</p>
                        <p className="text-sm text-muted-foreground">21/01/2024 03:00</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={handleBackup} disabled={loading} className="w-full">
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Criar Backup Manual
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configurações Avançadas
                </CardTitle>
                <CardDescription>
                  Configurações técnicas avançadas - use com cautela
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Estas configurações são para usuários avançados. Alterações incorretas podem 
                    causar instabilidade no sistema.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="cache-ttl">Cache TTL (segundos)</Label>
                  <Input
                    id="cache-ttl"
                    type="number"
                    defaultValue="3600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-version">Versão da API</Label>
                  <Select defaultValue="v2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">v1 (Legado)</SelectItem>
                      <SelectItem value="v2">v2 (Atual)</SelectItem>
                      <SelectItem value="v3">v3 (Beta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="debug-mode">Modo Debug</Label>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-config">Configuração JSON Customizada</Label>
                  <Textarea
                    id="custom-config"
                    placeholder='{"feature_flags": {"new_ui": true}}'
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}