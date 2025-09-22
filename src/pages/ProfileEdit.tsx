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
  MapPin,
  Search
} from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
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
  
  const [addressData, setAddressData] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Fetch address data
  useEffect(() => {
    const fetchAddress = async () => {
      if (user) {
        try {
          const { data: address, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_primary', true)
            .maybeSingle();
          
          if (address && !error) {
            setAddressData({
              street: address.street || '',
              number: address.number || '',
              complement: address.complement || '',
              neighborhood: address.neighborhood || '',
              city: address.city || '',
              state: address.state || '',
              zipcode: address.zipcode || '',
              latitude: address.latitude || null,
              longitude: address.longitude || null
            });
          }
        } catch (error) {
          console.error('Error fetching address:', error);
        }
      }
    };

    fetchAddress();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: (profile as any).bio || '',
        document_number: (profile as any).document_number || '',
        birth_date: (profile as any).birth_date || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setAddressData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas imagens",
          variant: "destructive",
        });
        return;
      }

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

  const handleSaveAddress = async () => {
    if (!user) return false;

    try {
      setAddressLoading(true);
      
      const { data: existingAddress } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (existingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update({
            street: addressData.street,
            number: addressData.number,
            complement: addressData.complement,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            zipcode: addressData.zipcode,
            latitude: addressData.latitude,
            longitude: addressData.longitude
          })
          .eq('id', existingAddress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('addresses')
          .insert([{
            user_id: user.id,
            street: addressData.street,
            number: addressData.number,
            complement: addressData.complement,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            zipcode: addressData.zipcode,
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            is_primary: true,
            label: 'Principal'
          }]);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Erro ao salvar endereço",
        description: "Não foi possível salvar o endereço. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      const success = await updateProfile({
        ...formData,
        avatar_url: avatarUrl
      });

      const addressSaved = await handleSaveAddress();

      if (success && addressSaved) {
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
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
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
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Para alterar o telefone, entre em contato com o suporte
                    </p>
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

          {/* Address Tab */}
          <TabsContent value="address" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço Principal
                </CardTitle>
                <CardDescription>
                  Atualize seu endereço principal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Endereço com Autocomplete</Label>
                  <AddressAutocomplete
                    value={`${addressData.street}${addressData.number ? `, ${addressData.number}` : ''}, ${addressData.neighborhood}, ${addressData.city}`}
                    onChange={(address, coordinates) => {
                      // Parse the returned address string and coordinates
                      if (coordinates) {
                        setAddressData(prev => ({
                          ...prev,
                          latitude: coordinates[1], // latitude
                          longitude: coordinates[0] // longitude
                        }));
                      }
                    }}
                    placeholder="Digite seu endereço..."
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="street">Rua/Avenida</Label>
                    <Input
                      id="street"
                      placeholder="Nome da rua"
                      value={addressData.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      placeholder="123"
                      value={addressData.number}
                      onChange={(e) => handleAddressChange('number', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      placeholder="Apto, bloco, etc."
                      value={addressData.complement}
                      onChange={(e) => handleAddressChange('complement', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Nome do bairro"
                      value={addressData.neighborhood}
                      onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Nome da cidade"
                      value={addressData.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      placeholder="SP"
                      value={addressData.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">CEP</Label>
                    <Input
                      id="zipcode"
                      placeholder="00000-000"
                      value={addressData.zipcode}
                      onChange={(e) => handleAddressChange('zipcode', e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveAddress} disabled={addressLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {addressLoading ? 'Salvando...' : 'Salvar Endereço'}
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
                  <h4 className="font-medium">Alterar Senha</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nova Senha</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                        placeholder="Digite a senha novamente"
                      />
                    </div>
                    <Button onClick={handlePasswordChange} size="sm">
                      <Key className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </Button>
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