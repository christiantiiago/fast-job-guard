import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useKYCManagement } from '@/hooks/useKYCManagement';
import { useRealTimeUsers } from '@/hooks/useRealTimeUsers';
import { useToast } from '@/hooks/use-toast';
import { RealTimeActivityFeed } from './RealTimeActivityFeed';
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Bot,
  Camera,
  Shield,
  Eye,
  Brain,
  User
} from 'lucide-react';

export const EnhancedKYCDashboard = () => {
  const { documents, stats, loading, approveDocument, rejectDocument } = useKYCManagement();
  const { users } = useRealTimeUsers();
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState<string | null>(null);

  // Calculate enhanced KYC statistics
  const usersWithoutKYC = users.filter(user => 
    user.kyc_status === 'incomplete' || user.kyc_status === 'pending'
  );
  
  const usersMissingDocs = users.filter(user => {
    const userDocs = documents.filter(doc => doc.user_id === user.user_id);
    const requiredDocs = user.role === 'provider' 
      ? ['rg', 'cpf', 'selfie', 'criminal_background']
      : ['rg', 'cpf', 'selfie'];
    
    return requiredDocs.some(docType => 
      !userDocs.find(doc => doc.document_type === docType)
    );
  });

  const expiredCriminalBackgrounds = documents.filter(doc =>
    doc.document_type === 'criminal_background' &&
    doc.created_at < new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString() // 6 months old
  );

  const runAIAnalysis = async (documentId: string) => {
    try {
      setAiAnalyzing(documentId);
      
      // Call AI analysis edge function
      const { data, error } = await supabase.functions.invoke('ai-fraud-detector', {
        body: {
          type: 'kyc_document',
          data: documents.find(d => d.id === documentId),
          metadata: {
            userHistory: 'First submission',
            previousAnalysis: 'None'
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Análise IA concluída',
        description: `Documento analisado. Nível de risco: ${data.riskLevel}`,
        variant: data.riskLevel === 'high' || data.riskLevel === 'critical' ? 'destructive' : 'default'
      });

    } catch (error) {
      toast({
        title: 'Erro na análise IA',
        description: 'Não foi possível analisar o documento.',
        variant: 'destructive'
      });
    } finally {
      setAiAnalyzing(null);
    }
  };

  const getDocumentIcon = (docType: string) => {
    const icons: Record<string, any> = {
      'rg': FileText,
      'cpf': FileText,
      'selfie': Camera,
      'address_proof': FileText,
      'criminal_background': Shield,
      'bank_info': FileText
    };
    return icons[docType] || FileText;
  };

  const getDocumentLabel = (docType: string) => {
    const labels: Record<string, string> = {
      'rg': 'RG',
      'cpf': 'CPF',
      'selfie': 'Selfie',
      'address_proof': 'Comprovante de Residência',
      'criminal_background': 'Antecedentes Criminais',
      'bank_info': 'Dados Bancários'
    };
    return labels[docType] || docType;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced KYC Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending_documents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando análise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários sem KYC</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{usersWithoutKYC.length}</div>
            <p className="text-xs text-muted-foreground">
              Não iniciaram KYC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docs Faltando</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{usersMissingDocs.length}</div>
            <p className="text-xs text-muted-foreground">
              Perfis incompletos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docs Expirados</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCriminalBackgrounds.length}</div>
            <p className="text-xs text-muted-foreground">
              Precisam renovar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              85%
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({stats.pending_documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="missing">Sem KYC ({usersWithoutKYC.length})</TabsTrigger>
          <TabsTrigger value="incomplete">Incompletos ({usersMissingDocs.length})</TabsTrigger>
          <TabsTrigger value="expired">Expirados ({expiredCriminalBackgrounds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Documentos Aguardando Análise
              </CardTitle>
              <CardDescription>
                KYC enviados pelos usuários aguardando verificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats.pending_documents || []).slice(0, 10).map((doc: any) => {
                  const Icon = getDocumentIcon(doc.document_type);
                  return (
                    <div key={doc.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Icon className="h-5 w-5 text-blue-500" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <h3 className="font-medium">{getDocumentLabel(doc.document_type)}</h3>
                           <Badge variant="secondary">
                             <User className="w-3 h-3 mr-1" />
                             {doc.user_name || 'Usuário não identificado'}
                           </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')} • {doc.file_name}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runAIAnalysis(doc.id)}
                          disabled={aiAnalyzing === doc.id}
                        >
                          {aiAnalyzing === doc.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Brain className="h-3 w-3 mr-1" />
                              IA
                            </>
                          )}
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Revisar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                               <DialogTitle>
                                 {getDocumentLabel(doc.document_type)} - {doc.user_name || 'Usuário não identificado'}
                               </DialogTitle>
                              <DialogDescription>
                                Análise completa do documento KYC
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="border rounded-lg p-4">
                                {doc.file_url.toLowerCase().includes('.pdf') ? (
                                  <div className="text-center p-8 bg-gray-50 rounded">
                                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600">Arquivo PDF</p>
                                    <a 
                                      href={doc.file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline text-sm"
                                    >
                                      Abrir arquivo
                                    </a>
                                  </div>
                                 ) : (
                                   <div className="relative">
                                     <img
                                       src={doc.file_url}
                                       alt="Documento"
                                       className="max-w-full h-auto max-h-96 mx-auto rounded border"
                                       onError={(e) => {
                                         console.error('Erro ao carregar imagem:', doc.file_url);
                                         e.currentTarget.src = '/placeholder.svg';
                                       }}
                                       onLoad={() => console.log('Imagem carregada:', doc.file_url)}
                                     />
                                     <div className="absolute top-2 right-2">
                                       <Button
                                         variant="secondary"
                                         size="sm"
                                         onClick={() => window.open(doc.file_url, '_blank')}
                                       >
                                         <Eye className="h-4 w-4 mr-2" />
                                         Abrir em nova aba
                                       </Button>
                                     </div>
                                   </div>
                                 )}
                              </div>

                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="destructive"
                                  onClick={() => rejectDocument(doc.id, 'Documento rejeitado após análise')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeitar
                                </Button>
                                <Button
                                  onClick={() => approveDocument(doc.id, 'Documento aprovado')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprovar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}

                {(stats.pending_documents?.length || 0) === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-500" />
                    <p>Nenhum documento pendente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                Usuários Sem KYC Iniciado
              </CardTitle>
              <CardDescription>
                Usuários que ainda não enviaram nenhum documento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usersWithoutKYC.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.role} • Registrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="destructive">
                        KYC: {user.kyc_status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Enviar Lembrete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incomplete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                KYC Incompleto
              </CardTitle>
              <CardDescription>
                Usuários com documentos faltando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usersMissingDocs.slice(0, 10).map((user) => {
                  const userDocs = documents.filter(doc => doc.user_id === user.user_id);
                  const requiredDocs = user.role === 'provider' 
                    ? ['rg', 'cpf', 'selfie', 'criminal_background']
                    : ['rg', 'cpf', 'selfie'];
                  
                  const missingDocs = requiredDocs.filter(docType => 
                    !userDocs.find(doc => doc.document_type === docType)
                  );

                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.role} • Faltam: {missingDocs.map(getDocumentLabel).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {userDocs.length}/{requiredDocs.length} docs
                        </Badge>
                        <Button variant="outline" size="sm">
                          Contatar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Documentos Expirados
              </CardTitle>
              <CardDescription>
                Antecedentes criminais que precisam ser renovados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiredCriminalBackgrounds.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="font-medium">Antecedentes Criminais</p>
                        <p className="text-sm text-muted-foreground">
                          Usuário: {doc.user_name || 'Unknown User'} • Expirado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="destructive">
                        Expirado
                      </Badge>
                      <Button variant="outline" size="sm">
                        Solicitar Renovação
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Atividades em Tempo Real */}
      <div className="mt-8">
        <RealTimeActivityFeed />
      </div>
    </div>
  );
};