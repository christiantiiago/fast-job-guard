import { AppLayout } from '@/components/layout/AppLayout';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon,
  DollarSign,
  Shield,
  Mail,
  Globe,
  Clock,
  Users,
  Bell,
  Database,
  Download,
  Upload,
  Trash2,
  Plus,
  Edit,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { 
    config, 
    loading, 
    updateConfig, 
    exportConfig, 
    importConfig,
    resetToDefaults 
  } = useSystemConfig();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('fees');
  const [localConfig, setLocalConfig] = useState({
    fees: {},
    security: {},
    notifications: {}
  });

  const handleSave = async (section: string) => {
    try {
      await updateConfig(section, localConfig[section]);
      toast({
        title: "Configurações salvas",
        description: "As alterações foram aplicadas com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
      });
    }
  };

  const handleConfigChange = (section: string, key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">
              Gerencie todas as configurações da plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="fees">Taxas</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          </TabsList>

          {/* Fees Configuration */}
          <TabsContent value="fees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Configuração de Taxas
                </CardTitle>
                <CardDescription>
                  Defina as taxas cobradas da plataforma para clientes e prestadores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Taxas para Clientes</h4>
                    <div className="space-y-2">
                      <Label htmlFor="client-standard">Taxa Padrão (%)</Label>
                      <Input
                        id="client-standard"
                        type="number"
                        step="0.01"
                        value={localConfig.fees?.clientStandard || 5}
                        onChange={(e) => handleConfigChange('fees', 'clientStandard', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-premium">Taxa Premium (%)</Label>
                      <Input
                        id="client-premium"
                        type="number"
                        step="0.01"
                        value={localConfig.fees?.clientPremium || 3.5}
                        onChange={(e) => handleConfigChange('fees', 'clientPremium', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Taxas para Prestadores</h4>
                    <div className="space-y-2">
                      <Label htmlFor="provider-standard">Taxa Padrão (%)</Label>
                      <Input
                        id="provider-standard"
                        type="number"
                        step="0.01"
                        value={localConfig.fees?.providerStandard || 5}
                        onChange={(e) => handleConfigChange('fees', 'providerStandard', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider-premium">Taxa Premium (%)</Label>
                      <Input
                        id="provider-premium"
                        type="number"
                        step="0.01"
                        value={localConfig.fees?.providerPremium || 3.5}
                        onChange={(e) => handleConfigChange('fees', 'providerPremium', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Configurações de Pagamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-payout">Valor Mínimo Saque</Label>
                      <Input
                        id="min-payout"
                        type="number"
                        value={localConfig.fees?.minPayout || 50}
                        onChange={(e) => handleConfigChange('fees', 'minPayout', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-job">Valor Máximo Job</Label>
                      <Input
                        id="max-job"
                        type="number"
                        value={localConfig.fees?.maxJobValue || 10000}
                        onChange={(e) => handleConfigChange('fees', 'maxJobValue', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="escrow-days">Dias Escrow</Label>
                      <Input
                        id="escrow-days"
                        type="number"
                        value={localConfig.fees?.escrowDays || 3}
                        onChange={(e) => handleConfigChange('fees', 'escrowDays', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('fees')}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações de Taxas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Configuration */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Gerencie autenticação, biometria e políticas de segurança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="facial-auth">Autenticação Facial Obrigatória</Label>
                      <p className="text-sm text-muted-foreground">
                        Exigir verificação biométrica para ações sensíveis
                      </p>
                    </div>
                    <Switch
                      id="facial-auth"
                      checked={localConfig.security?.facialAuthRequired || false}
                      onCheckedChange={(checked) => handleConfigChange('security', 'facialAuthRequired', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="random-verification">Verificação Aleatória</Label>
                      <p className="text-sm text-muted-foreground">
                        Solicitar verificação facial aleatoriamente (5% das ações)
                      </p>
                    </div>
                    <Switch
                      id="random-verification"
                      checked={localConfig.security?.randomVerification || false}
                      onCheckedChange={(checked) => handleConfigChange('security', 'randomVerification', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ip-blocking">Bloqueio por IP</Label>
                      <p className="text-sm text-muted-foreground">
                        Bloquear IPs suspeitos automaticamente
                      </p>
                    </div>
                    <Switch
                      id="ip-blocking"
                      checked={localConfig.security?.ipBlocking || false}
                      onCheckedChange={(checked) => handleConfigChange('security', 'ipBlocking', checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Timeout Sessão (minutos)</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      value={localConfig.security?.sessionTimeout || 120}
                      onChange={(e) => handleConfigChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-attempts">Máx. Tentativas Login</Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      value={localConfig.security?.maxLoginAttempts || 5}
                      onChange={(e) => handleConfigChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockout-duration">Duração Bloqueio (minutos)</Label>
                    <Input
                      id="lockout-duration"
                      type="number"
                      value={localConfig.security?.lockoutDuration || 30}
                      onChange={(e) => handleConfigChange('security', 'lockoutDuration', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-strength">Força da Senha</Label>
                    <Select
                      value={localConfig.security?.passwordStrength || 'medium'}
                      onValueChange={(value) => handleConfigChange('security', 'passwordStrength', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weak">Fraca</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="strong">Forte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={() => handleSave('security')}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações de Segurança
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Configuration */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Configurações de Notificações
                </CardTitle>
                <CardDescription>
                  Configure notificações push, email e SMS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Tipos de Notificação</h4>
                  
                  {[
                    { key: 'newJob', label: 'Novo Job Criado', description: 'Notificar prestadores próximos' },
                    { key: 'jobAccepted', label: 'Job Aceito', description: 'Notificar cliente quando job for aceito' },
                    { key: 'jobCompleted', label: 'Job Completado', description: 'Notificar partes quando job for finalizado' },
                    { key: 'paymentReceived', label: 'Pagamento Recebido', description: 'Notificar sobre pagamentos' },
                    { key: 'disputeOpened', label: 'Disputa Aberta', description: 'Notificar admins sobre disputas' },
                    { key: 'kycRequired', label: 'KYC Necessário', description: 'Lembrar usuários sobre verificação' }
                  ].map(notification => (
                    <div key={notification.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>{notification.label}</Label>
                          <p className="text-sm text-muted-foreground">{notification.description}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={localConfig.notifications?.[notification.key]?.email || false}
                              onCheckedChange={(checked) => 
                                handleConfigChange('notifications', `${notification.key}.email`, checked)
                              }
                            />
                            <Label className="text-sm">Email</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={localConfig.notifications?.[notification.key]?.push || false}
                              onCheckedChange={(checked) => 
                                handleConfigChange('notifications', `${notification.key}.push`, checked)
                              }
                            />
                            <Label className="text-sm">Push</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={localConfig.notifications?.[notification.key]?.sms || false}
                              onCheckedChange={(checked) => 
                                handleConfigChange('notifications', `${notification.key}.sms`, checked)
                              }
                            />
                            <Label className="text-sm">SMS</Label>
                          </div>
                        </div>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>

                <Button onClick={() => handleSave('notifications')}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações de Notificações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would continue similarly... */}
          
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Manutenção do Sistema
                </CardTitle>
                <CardDescription>
                  Ferramentas de backup, limpeza e manutenção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Backup Automático</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Último backup: há 2 horas
                    </p>
                    <Button variant="outline" className="w-full">
                      Executar Backup Manual
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Limpeza de Logs</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Limpar logs antigos (&gt;90 dias)
                    </p>
                    <Button variant="outline" className="w-full">
                      Limpar Logs Antigos
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Cache do Sistema</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Limpar cache para melhorar performance
                    </p>
                    <Button variant="outline" className="w-full">
                      Limpar Cache
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Reindexação</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Otimizar índices do banco de dados
                    </p>
                    <Button variant="outline" className="w-full">
                      Reindexar Database
                    </Button>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div>
                      <h4 className="font-medium text-destructive">Zona de Perigo</h4>
                      <p className="text-sm text-muted-foreground">
                        Ações irreversíveis que afetam todo o sistema
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={resetToDefaults}>
                        Restaurar Padrões
                      </Button>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset Sistema
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
