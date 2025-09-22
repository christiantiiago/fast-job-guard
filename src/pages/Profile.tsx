import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useReviews } from '@/hooks/useReviews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { SecuritySettings } from '@/components/profile/SecuritySettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
  Crown,
  Settings,
  Lock,
  Bell,
  TrendingUp
} from 'lucide-react';

export default function Profile() {
  const { user, userRole } = useAuth();
  const { profile, address, stats, loading, updating } = useProfile();
  const { status: kycStatus } = useKYCStatus();
  const { premiumStatus } = usePremiumStatus();
  const { reviews, stats: reviewStats } = useReviews();

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
    // Usar o status real do KYC baseado nos documentos aprovados
    const realStatus = kycStatus?.canUsePlatform ? 'approved' : 
                      kycStatus?.isComplete ? 'em_analise' :
                      kycStatus?.rejectedDocs.length > 0 ? 'rejected' : 'pending';
                      
    switch (realStatus) {
      case 'approved':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'em_analise':
        return <Badge variant="default" className="bg-info/10 text-info border-info/20"><Clock className="w-3 h-3 mr-1" />Em Análise</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'rejected':
        return <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Incompleto</Badge>;
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
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Pessoal
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Segurança
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-6">
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
                         {profile?.avatar_url ? (
                           <img 
                             src={profile.avatar_url} 
                             alt={profile?.full_name || 'Avatar'}
                             className="w-full h-full object-cover rounded-full"
                           />
                         ) : (
                           <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                             {profile?.full_name 
                               ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                               : user?.email?.[0].toUpperCase() || '?'}
                           </AvatarFallback>
                         )}
                       </Avatar>
                         <div>
                           <div className="flex items-center gap-2">
                             <h3 className="text-lg font-medium">
                               {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                             </h3>
                             {premiumStatus.is_premium && (
                               <Crown className="h-4 w-4 text-accent" />
                             )}
                             {kycStatus?.canUsePlatform && (
                               <VerificationBadge 
                                 isVerified={true} 
                                 verifiedAt={kycStatus?.verifiedAt}
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
                        <p className="text-sm text-muted-foreground">
                          {address ? (
                            `${address.street}${address.number ? `, ${address.number}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, ${address.country}`
                          ) : (
                            'Não informado'
                          )}
                        </p>
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
                           {getKycStatusBadge(kycStatus?.kyc_status || 'incomplete')}
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

                {/* Reviews Section */}
                {reviews.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-warning" />
                        Avaliações Recebidas
                      </CardTitle>
                      <CardDescription>
                        {reviewStats.totalReviews} avaliações • Média: {reviewStats.averageRating.toFixed(1)}/5
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {reviews.slice(0, 3).map((review) => (
                          <div key={review.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                {review.reviewer_avatar ? (
                                  <img src={review.reviewer_avatar} alt={review.reviewer_name} />
                                ) : (
                                  <AvatarFallback>
                                    {review.reviewer_name?.charAt(0).toUpperCase() || '?'}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{review.reviewer_name}</span>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3 h-3 ${star <= review.rating ? 'text-warning fill-current' : 'text-muted-foreground'}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {review.job_title} • {new Date(review.created_at).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-sm">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {reviews.length > 3 && (
                          <Button variant="outline" asChild className="w-full">
                            <Link to="/reviews">
                              Ver todas as avaliações ({reviews.length})
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
               </TabsContent>

              <TabsContent value="security" className="mt-6">
                <SecuritySettings userRole={userRole} />
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações de Notificação</CardTitle>
                    <CardDescription>
                      Gerencie suas preferências de notificação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      As configurações de notificação estão disponíveis na aba Segurança.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
                          {reviewStats?.averageRating ? `${reviewStats.averageRating.toFixed(1)}/5` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Avaliação média ({reviewStats?.totalReviews || 0} reviews)
                        </div>
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
                          {reviewStats?.averageRating ? `${reviewStats.averageRating.toFixed(1)}/5` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Satisfação média ({reviewStats?.totalReviews || 0} reviews)
                        </div>
                      </div>
                   </>
                 )}
               </CardContent>
            </Card>

            {/* Premium Status - Only show for non-client users or providers */}
            {userRole !== 'client' && (
              <Card className={premiumStatus.is_premium ? 'border-accent/20' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-accent" />
                    Premium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant={premiumStatus.is_premium ? "default" : "outline"} 
                             className={premiumStatus.is_premium ? "bg-accent/10 text-accent border-accent/20" : ""}>
                        {premiumStatus.is_premium ? 'ATIVO' : 'INATIVO'}
                      </Badge>
                    </div>
                    {premiumStatus.is_premium ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Plano</span>
                          <span className="text-sm font-medium">Premium</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Taxa reduzida</span>
                          <span className="text-sm font-medium text-success">3.5%</span>
                        </div>
                        {premiumStatus.subscription?.current_period_end && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">
                              Próxima cobrança:
                            </p>
                            <p className="text-sm font-medium">
                              {new Date(premiumStatus.subscription.current_period_end).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm"
                          asChild
                        >
                          <Link to="/premium">
                            <Settings className="mr-2 h-4 w-4" />
                            Gerenciar Premium
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            Desbloqueie recursos exclusivos
                          </p>
                          <Button 
                            className="w-full bg-gradient-to-r from-accent to-accent/80 text-white" 
                            size="sm"
                            asChild
                          >
                            <Link to="/premium">
                              <Crown className="mr-2 h-4 w-4" />
                              Tornar-se Premium
                            </Link>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações Avançadas
                </Button>
                {userRole === 'client' && (
                  <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                    <Link to="/jobs/boost">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Impulsionar Trabalho
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link to="/profile/edit?tab=security">
                    <Shield className="mr-2 h-4 w-4" />
                    Configurar segurança
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                  <Link to="/kyc/documents">
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