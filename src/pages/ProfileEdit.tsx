import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Camera, 
  Shield, 
  Key, 
  Bell,
  ArrowLeft,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfileEdit() {
  const { user, userRole } = useAuth();
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    document_number: '',
    birth_date: ''
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: '',  // Default value since bio might not exist in profile type
        document_number: (profile as any).document_number || '',
        birth_date: (profile as any).birth_date || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas imagens",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    try {
      setUploading(true);

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a foto. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      const success = await updateProfile({
        ...formData,
        avatar_url: avatarUrl
      });

      if (success) {
        toast({
          title: "Perfil atualizado!",
          description: "Suas informações foram salvas com sucesso.",
        });
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new.length < 6) {
      toast({
        title: "Senha muito fraca",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordData({ current: '', new: '', confirm: '' });
      setShowChangePassword(false);
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Editar Perfil</h1>
            <p className="text-muted-foreground">
              Atualize suas informações pessoais e configurações
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize seus dados pessoais e foto de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} />
                      ) : profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                          {formData.full_name 
                            ? formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                            : user?.email?.[0].toUpperCase() || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                          <Camera className="w-4 h-4" />
                        </div>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">Foto do Perfil</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      JPG, PNG ou WEBP (máx. 5MB)
                    </p>
                    {avatarFile && (
                      <p className="text-xs text-green-600 mb-2">
                        Nova foto selecionada: {avatarFile.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document_number">CPF</Label>
                    <Input
                      id="document_number"
                      value={formData.document_number}
                      onChange={(e) => handleInputChange('document_number', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    />
                  </div>
                </div>

                {userRole === 'provider' && (
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografia</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Conte um pouco sobre você e sua experiência..."
                      rows={4}
                    />
                  </div>
                )}

                <Button onClick={handleSaveProfile} disabled={loading || uploading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading || uploading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Gerencie sua senha e configurações de segurança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Alterar Senha</h4>
                      <p className="text-sm text-muted-foreground">
                        Última alteração há mais de 30 dias
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowChangePassword(!showChangePassword)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Alterar
                    </Button>
                  </div>

                  {showChangePassword && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current_password">Senha Atual</Label>
                          <Input
                            id="current_password"
                            type="password"
                            value={passwordData.current}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_password">Nova Senha</Label>
                          <Input
                            id="new_password"
                            type="password"
                            value={passwordData.new}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                          <Input
                            id="confirm_password"
                            type="password"
                            value={passwordData.confirm}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handlePasswordChange} size="sm">
                            Salvar Nova Senha
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowChangePassword(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                      <p className="text-sm text-muted-foreground">
                        Adicione uma camada extra de segurança
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Em Breve
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Verificação Facial</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure verificação biométrica
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Configurar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>
                  Configure como você quer receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Novos trabalhos</h4>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações sobre novos trabalhos
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Propostas recebidas</h4>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando receber novas propostas
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Mensagens</h4>
                      <p className="text-sm text-muted-foreground">
                        Notificações de chat e mensagens
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Atualizações do KYC</h4>
                      <p className="text-sm text-muted-foreground">
                        Status dos seus documentos
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked />
                  </div>
                </div>

                <Button className="w-full">
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}