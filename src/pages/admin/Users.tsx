import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Check, 
  X, 
  Eye, 
  UserCheck, 
  UserX,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  Star
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'provider' | 'admin';
  kycStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
  createdAt: string;
  lastLogin: string;
  rating?: number;
  totalJobs: number;
  status: 'active' | 'suspended' | 'inactive';
}

interface ProfileEditRequest {
  id: string;
  userId: string;
  userName: string;
  requestedChanges: {
    name?: string;
    phone?: string;
    address?: string;
  };
  reason: string;
  requestedAt: string;
  status: 'pending';
}

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showKycDialog, setShowKycDialog] = useState(false);

  // Mock data - em produção seria uma consulta real
  const users: User[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@email.com',
      role: 'client',
      kycStatus: 'approved',
      createdAt: '2024-01-15',
      lastLogin: '2024-01-20',
      totalJobs: 8,
      status: 'active'
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@email.com',
      role: 'provider',
      kycStatus: 'pending',
      createdAt: '2024-01-18',
      lastLogin: '2024-01-19',
      rating: 4.8,
      totalJobs: 15,
      status: 'active'
    },
    {
      id: '3',
      name: 'Carlos Pereira',
      email: 'carlos@email.com',
      role: 'provider',
      kycStatus: 'rejected',
      createdAt: '2024-01-10',
      lastLogin: '2024-01-18',
      rating: 4.2,
      totalJobs: 3,
      status: 'suspended'
    },
    {
      id: '4',
      name: 'Ana Costa',
      email: 'ana@email.com',
      role: 'client',
      kycStatus: 'approved',
      createdAt: '2024-01-12',
      lastLogin: '2024-01-21',
      totalJobs: 12,
      status: 'active'
    }
  ];

  const profileEditRequests: ProfileEditRequest[] = [
    {
      id: '1',
      userId: '2',
      userName: 'Maria Santos',
      requestedChanges: {
        name: 'Maria Santos Silva',
        phone: '(11) 99999-9999'
      },
      reason: 'Atualização após casamento',
      requestedAt: '2024-01-20',
      status: 'pending'
    },
    {
      id: '2',
      userId: '4',
      userName: 'Ana Costa',
      requestedChanges: {
        address: 'Nova rua, 456 - São Paulo, SP'
      },
      reason: 'Mudança de endereço',
      requestedAt: '2024-01-19',
      status: 'pending'
    }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      suspended: 'destructive',
      inactive: 'secondary'
    } as const;
    
    const labels = {
      active: 'Ativo',
      suspended: 'Suspenso',
      inactive: 'Inativo'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getKycBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      incomplete: 'outline'
    } as const;
    
    const labels = {
      approved: 'Aprovado',
      pending: 'Pendente',
      rejected: 'Rejeitado',
      incomplete: 'Incompleto'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleApproveKyc = (userId: string) => {
    console.log('Aprovar KYC:', userId);
    // Implementar lógica de aprovação
  };

  const handleRejectKyc = (userId: string) => {
    console.log('Rejeitar KYC:', userId);
    // Implementar lógica de rejeição
  };

  const handleApproveProfileEdit = (requestId: string) => {
    console.log('Aprovar edição de perfil:', requestId);
    // Implementar lógica de aprovação
  };

  const handleRejectProfileEdit = (requestId: string) => {
    console.log('Rejeitar edição de perfil:', requestId);
    // Implementar lógica de rejeição
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Gerenciar Usuários
            </h1>
            <p className="text-muted-foreground">
              Aprovar documentos KYC, gerenciar perfis e moderação de usuários
            </p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
            <TabsTrigger value="kyc">KYC Pendente ({users.filter(u => u.kycStatus === 'pending').length})</TabsTrigger>
            <TabsTrigger value="profile-edits">Edições Pendentes ({profileEditRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os papéis</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="provider">Prestador</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                  {filteredUsers.length} usuários encontrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>KYC</TableHead>
                        <TableHead>Jobs</TableHead>
                        <TableHead>Último Login</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{user.totalJobs}</span>
                              {user.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-sm">{user.rating}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowKycDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {user.kycStatus === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveKyc(user.id)}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectKyc(user.id)}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Verificações KYC Pendentes
                </CardTitle>
                <CardDescription>
                  Documentos aguardando aprovação para prestadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.filter(u => u.kycStatus === 'pending').map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Solicitado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowKycDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Revisar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveKyc(user.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectKyc(user.id)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile-edits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Solicitações de Edição de Perfil
                </CardTitle>
                <CardDescription>
                  Alterações de perfil aguardando aprovação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileEditRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{request.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            Solicitado em {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <Badge variant="secondary">Pendente</Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-2">Alterações solicitadas:</div>
                        <div className="space-y-1 text-sm">
                          {Object.entries(request.requestedChanges).map(([field, value]) => (
                            <div key={field} className="flex gap-2">
                              <span className="text-muted-foreground capitalize">{field}:</span>
                              <span>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium">Motivo:</div>
                        <div className="text-sm text-muted-foreground">{request.reason}</div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveProfileEdit(request.id)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectProfileEdit(request.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* KYC Dialog */}
        <Dialog open={showKycDialog} onOpenChange={setShowKycDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Verificação KYC - {selectedUser?.name}</DialogTitle>
              <DialogDescription>
                Revisar documentos enviados pelo prestador
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Papel:</span>
                    <p className="text-sm text-muted-foreground capitalize">{selectedUser.role}</p>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Em produção, aqui seriam exibidos os documentos enviados (RG, CPF, selfie, comprovante de residência).
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      handleApproveKyc(selectedUser.id);
                      setShowKycDialog(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar KYC
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleRejectKyc(selectedUser.id);
                      setShowKycDialog(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar KYC
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}