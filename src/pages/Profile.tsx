import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Shield, 
  Star,
  Edit,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

export default function Profile() {
  const { user, userRole } = useAuth();

  // Mock data - in real app would come from API
  const profileData = {
    fullName: 'João Silva',
    email: user?.email || '',
    phone: '(11) 99999-9999',
    avatar: '',
    rating: 4.8,
    reviewCount: 23,
    kycStatus: 'approved',
    subscriptionStatus: 'active',
    completedJobs: 18,
    totalEarnings: 'R$ 2.450'
  };

  const kycDocuments = [
    { type: 'RG/CPF', status: 'approved', uploadedAt: '2024-01-15' },
    { type: 'Selfie', status: 'approved', uploadedAt: '2024-01-15' },
    { type: 'Comprovante de Residência', status: 'approved', uploadedAt: '2024-01-15' },
    { type: 'Dados Bancários', status: 'pending', uploadedAt: '2024-01-20' }
  ];

  const getKycStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'rejected':
        return <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Não enviado</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e configurações
            </p>
          </div>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Seus dados pessoais e de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {profileData.fullName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{profileData.fullName}</h3>
                    <p className="text-muted-foreground capitalize">{userRole}</p>
                    {userRole === 'provider' && (
                      <div className="flex items-center mt-1">
                        <Star className="w-4 h-4 text-warning fill-current" />
                        <span className="ml-1 text-sm font-medium">{profileData.rating}</span>
                        <span className="ml-1 text-sm text-muted-foreground">
                          ({profileData.reviewCount} avaliações)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">E-mail</p>
                      <p className="text-sm text-muted-foreground">{profileData.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">{profileData.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-muted-foreground">São Paulo, SP - Brasil</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KYC Status for Providers */}
            {userRole === 'provider' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Verificação (KYC)
                  </CardTitle>
                  <CardDescription>
                    Status dos seus documentos de verificação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status Geral</span>
                      {getKycStatusBadge(profileData.kycStatus)}
                    </div>

                    <div className="space-y-3">
                      {kycDocuments.map((doc) => (
                        <div key={doc.type} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.type}</p>
                              <p className="text-xs text-muted-foreground">
                                Enviado em {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          {getKycStatusBadge(doc.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userRole === 'provider' ? (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{profileData.completedJobs}</div>
                      <div className="text-sm text-muted-foreground">Trabalhos concluídos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{profileData.totalEarnings}</div>
                      <div className="text-sm text-muted-foreground">Total ganho</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">{profileData.rating}/5</div>
                      <div className="text-sm text-muted-foreground">Avaliação média</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">12</div>
                      <div className="text-sm text-muted-foreground">Trabalhos publicados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">8</div>
                      <div className="text-sm text-muted-foreground">Concluídos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">4.9/5</div>
                      <div className="text-sm text-muted-foreground">Satisfação média</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle>Assinatura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant="default" className="bg-success/10 text-success border-success/20">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plano</span>
                    <span className="text-sm font-medium">Premium</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Taxa reduzida</span>
                    <span className="text-sm font-medium text-success">3.5%</span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      Economia acumulada com taxa reduzida:
                    </p>
                    <p className="text-lg font-bold text-success">R$ 127,50</p>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    Gerenciar Assinatura
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Editar informações
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Shield className="mr-2 h-4 w-4" />
                  Configurar segurança
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Baixar comprovantes
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}