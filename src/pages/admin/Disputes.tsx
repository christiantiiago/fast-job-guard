import { AppLayout } from '@/components/layout/AppLayout';
import { useDisputeManagement } from '@/hooks/useDisputeManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Send,
  Paperclip,
  Eye,
  Download,
  User,
  Calendar,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDisputes() {
  const { 
    disputes, 
    stats, 
    loading, 
    resolveDispute, 
    escalateDispute,
    addComment,
    updateStatus 
  } = useDisputeManagement();
  
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [commentText, setCommentText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'destructive',
      in_review: 'secondary', 
      escalated: 'destructive',
      resolved: 'default'
    };
    return <Badge variant={(variants[status as keyof typeof variants] || 'default') as any}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    );
  };

  const handleResolve = async (disputeId: string) => {
    try {
      await resolveDispute(disputeId, resolutionNotes);
      setSelectedDispute(null);
      setResolutionNotes('');
    } catch (error) {
      console.error('Error resolving dispute:', error);
    }
  };

  const handleAddComment = async (disputeId: string) => {
    if (!commentText.trim()) return;
    
    try {
      await addComment(disputeId, commentText);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
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
            <h1 className="text-3xl font-bold">Gestão de Disputas</h1>
            <p className="text-muted-foreground">
              Resolva conflitos e mantenha a qualidade da plataforma
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Abertas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.open}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inReview}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolvidas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold">{stats.avgResolutionTime}h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar disputas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="open">Abertas</SelectItem>
                  <SelectItem value="in_review">Em Análise</SelectItem>
                  <SelectItem value="escalated">Escaladas</SelectItem>
                  <SelectItem value="resolved">Resolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-4">
                      <h3 className="font-semibold text-lg">{dispute.reason}</h3>
                      {getStatusBadge(dispute.status)}
                      {dispute.priority && getPriorityBadge(dispute.priority)}
                    </div>
                    
                    <p className="text-muted-foreground line-clamp-2">
                      {dispute.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{dispute.user_name || 'Usuário desconhecido'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4" />
                        <span>{dispute.job_title || 'Job removido'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(dispute.created_at), 'PPp', { locale: ptBR })}
                        </span>
                      </div>
                      {dispute.job_value && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4" />
                          <span>R$ {Number(dispute.job_value).toLocaleString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDispute(dispute)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>Detalhes da Disputa</DialogTitle>
                          <DialogDescription>
                            Gerencie e resolva esta disputa
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedDispute && (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-4">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center justify-between">
                                    <span>{selectedDispute.reason}</span>
                                    {getStatusBadge(selectedDispute.status)}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="whitespace-pre-wrap">
                                    {selectedDispute.description}
                                  </p>
                                </CardContent>
                              </Card>

                              {/* Evidence */}
                              {selectedDispute.evidence_urls?.length > 0 && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Evidências</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      {selectedDispute.evidence_urls.map((url: string, index: number) => (
                                        <Button
                                          key={index}
                                          variant="outline"
                                          size="sm"
                                          asChild
                                        >
                                          <a href={url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4 mr-2" />
                                            Evidência {index + 1}
                                          </a>
                                        </Button>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Comments/Timeline */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Histórico e Comentários</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ScrollArea className="h-60">
                                    <div className="space-y-4">
                                      {selectedDispute.comments?.map((comment: any, index: number) => (
                                        <div key={index} className="flex space-x-3">
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.author_avatar} />
                                            <AvatarFallback>
                                              {comment.author_name?.[0] || 'A'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center space-x-2">
                                              <span className="font-medium text-sm">
                                                {comment.author_name || 'Admin'}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {format(new Date(comment.created_at), 'PPp', { locale: ptBR })}
                                              </span>
                                            </div>
                                            <p className="text-sm">{comment.content}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                  
                                  {/* Add Comment */}
                                  <Separator className="my-4" />
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="Adicionar comentário..."
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                    />
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleAddComment(selectedDispute.id)}
                                      disabled={!commentText.trim()}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Enviar
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-4">
                              {/* Quick Actions */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Ações</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <Select 
                                    value={selectedDispute.status}
                                    onValueChange={(value) => updateStatus(selectedDispute.id, value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Aberta</SelectItem>
                                      <SelectItem value="in_review">Em Análise</SelectItem>
                                      <SelectItem value="escalated">Escalada</SelectItem>
                                      <SelectItem value="resolved">Resolvida</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  <Button 
                                    className="w-full" 
                                    variant="outline"
                                    onClick={() => escalateDispute(selectedDispute.id)}
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Escalar
                                  </Button>
                                </CardContent>
                              </Card>

                              {/* Resolution */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Resolução</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <Textarea
                                    placeholder="Notas da resolução..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                  />
                                  <Button 
                                    className="w-full"
                                    onClick={() => handleResolve(selectedDispute.id)}
                                    disabled={!resolutionNotes.trim()}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Resolver Disputa
                                  </Button>
                                </CardContent>
                              </Card>

                              {/* Job Details */}
                              {selectedDispute.job_details && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Detalhes do Job</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium">Título:</span>
                                      <p>{selectedDispute.job_details.title}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium">Valor:</span>
                                      <p>R$ {Number(selectedDispute.job_details.price || 0).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium">Status:</span>
                                      <p>{selectedDispute.job_details.status}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDisputes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma disputa encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Não há disputas para exibir no momento'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}