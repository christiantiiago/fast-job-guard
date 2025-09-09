import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
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
  XCircle,
  Loader2
} from 'lucide-react';

export default function Profile() {
  const { user, userRole } = useAuth();
  const { profile, stats, loading, updating } = useProfile();
  const { status: kycStatus } = useKYCStatus();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Mock KYC documents - this would come from kyc_documents table in real implementation
  const kycDocuments = [
    { type: 'RG/CPF', status: 'approved', uploadedAt: '2024-01-15' },
    { type: 'Selfie', status: 'approved', uploadedAt: '2024-01-15' },
    { type: 'Comprovante de Residência', status: 'approved', uploadedAt: '2024-01-15' },
    { type: 'Dados Bancários', status: 'pending', uploadedAt: '2024-01-20' }
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="text-center">
                        <Skeleton className="h-8 w-16 mx-auto mb-1" />
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
           <Button asChild disabled={updating}>
             <Link to="/profile/edit">
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Edit className="mr-2 h-4 w-4" />
              )}
              Editar Perfil
             </Link>
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
                       {profile?.full_name 
                         ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                         : user?.email?.[0].toUpperCase() || '?'}
                     </AvatarFallback>
                   </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">
                          {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                        </h3>
                        {kycStatus?.canUsePlatform && (
                          <VerificationBadge 
                            isVerified={true} 
                            verifiedAt={kycStatus?.documents?.find(d => d.is_verified && d.verified_at)?.verified_at}
                            size="md"
                          />
                        )}
                      </div>
                      <p className="text-muted-foreground capitalize">{userRole}</p>
                     {userRole === 'provider' && stats && (
                       <div className="flex items-center mt-1">
                         <Star className="w-4 h-4 text-warning fill-current" />
                         <span className="ml-1 text-sm font-medium">
                           {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                         </span>
                         <span className="ml-1 text-sm text-muted-foreground">
                           ({stats.reviewCount} avaliações)
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
                       <p className="text-sm text-muted-foreground">{user?.email}</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center space-x-3">
                     <Phone className="w-5 h-5 text-muted-foreground" />
                     <div>
                       <p className="text-sm font-medium">Telefone</p>
                       <p className="text-sm text-muted-foreground">
                         {profile?.phone || 'Não informado'}
                       </p>
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
                       {getKycStatusBadge(profile?.kyc_status || 'incomplete')}
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
                       <div className="text-2xl font-bold text-primary">
                         {stats?.completedJobs || 0}
                       </div>
                       <div className="text-sm text-muted-foreground">Trabalhos concluídos</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-success">
                         {stats?.totalEarnings ? formatCurrency(stats.totalEarnings) : 'R$ 0,00'}
                       </div>
                       <div className="text-sm text-muted-foreground">Total ganho</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-warning">
                         {stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
                       </div>
                       <div className="text-sm text-muted-foreground">Avaliação média</div>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-primary">
                         {stats?.totalJobs || 0}
                       </div>
                       <div className="text-sm text-muted-foreground">Trabalhos publicados</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-success">
                         {stats?.completedJobs || 0}
                       </div>
                       <div className="text-sm text-muted-foreground">Concluídos</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-warning">
                         {stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
                       </div>
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
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link to="/profile/edit">
                    <User className="mr-2 h-4 w-4" />
                    Editar informações
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link to="/profile/edit?tab=security">
                    <Shield className="mr-2 h-4 w-4" />
                    Configurar segurança
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link to="/documents">
                    <FileText className="mr-2 h-4 w-4" />
                    Ver documentos
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}