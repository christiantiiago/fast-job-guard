import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Eye,
  AlertTriangle,
  Shield,
  FileText,
  User,
  Calendar,
  Brain,
  Zap
} from 'lucide-react';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  is_verified: boolean;
  notes: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
    kyc_status: string;
  } | null;
  user_roles: {
    role: string;
  } | null;
  kyc_ai_analysis?: {
    id: string;
    confidence_score: number;
    fraud_indicators: string[];
    recommendations: string;
    analysis_result: any;
    processed_at: string;
  }[];
}

const AdminKYCEnhanced = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          profiles(full_name, phone, kyc_status),
          user_roles(role),
          kyc_ai_analysis(
            id,
            confidence_score,
            fraud_indicators,
            recommendations,
            analysis_result,
            processed_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data as any || []);
      setFilteredDocuments(data as any || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar documentos
  useEffect(() => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(doc => !doc.is_verified && !doc.notes);
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter(doc => doc.is_verified);
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(doc => !doc.is_verified && doc.notes);
      } else if (statusFilter === 'suspicious') {
        filtered = filtered.filter(doc => 
          doc.kyc_ai_analysis && doc.kyc_ai_analysis.length > 0 && 
          (doc.kyc_ai_analysis[0].confidence_score < 0.3 || doc.kyc_ai_analysis[0].fraud_indicators.length > 0)
        );
      }
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === typeFilter);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter, typeFilter]);

  const runAIAnalysis = async (documentId: string) => {
    setAnalysisLoading(documentId);
    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) return;

      const { data, error } = await supabase.functions.invoke('analyze-document-ai', {
        body: {
          documentId: document.id,
          documentType: document.document_type,
          imageUrl: document.file_url
        }
      });

      if (error) throw error;

      toast({
        title: "Análise concluída",
        description: "O documento foi analisado pela IA.",
      });

      // Recarregar documentos para ver a nova análise
      await fetchDocuments();
    } catch (error) {
      console.error('Erro na análise de IA:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar o documento.",
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(null);
    }
  };

  const approveDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: true,
          notes: 'Aprovado pelo administrador',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', docId);

      if (error) throw error;

      // Log da auditoria
      await supabase
        .from('kyc_admin_actions')
        .insert({
          document_id: docId,
          admin_id: (await supabase.auth.getUser()).data.user?.id || '',
          action: 'approved',
          previous_status: 'pending',
          new_status: 'approved',
          notes: 'Documento aprovado manualmente pelo administrador'
        });

      toast({
        title: "Documento aprovado",
        description: "O documento foi aprovado com sucesso.",
      });

      await fetchDocuments();
      setSelectedDocument(null);
    } catch (error) {
      console.error('Erro ao aprovar documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o documento.",
        variant: "destructive",
      });
    }
  };

  const rejectDocument = async (docId: string) => {
    if (!reviewNotes.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: false,
          notes: reviewNotes,
          verified_at: null,
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', docId);

      if (error) throw error;

      // Log da auditoria
      await supabase
        .from('kyc_admin_actions')
        .insert({
          document_id: docId,
          admin_id: (await supabase.auth.getUser()).data.user?.id || '',
          action: 'rejected',
          previous_status: 'pending',
          new_status: 'rejected',
          notes: reviewNotes
        });

      toast({
        title: "Documento rejeitado",
        description: "O documento foi rejeitado.",
      });

      await fetchDocuments();
      setSelectedDocument(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Erro ao rejeitar documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o documento.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (doc: KYCDocument) => {
    if (doc.is_verified) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Aprovado</Badge>;
    }
    
    if (doc.notes) {
      return <Badge variant="destructive">Rejeitado</Badge>;
    }

    // Verificar se tem análise de IA suspeita
    const hasAIAnalysis = doc.kyc_ai_analysis && doc.kyc_ai_analysis.length > 0;
    if (hasAIAnalysis) {
      const analysis = doc.kyc_ai_analysis[0];
      if (analysis.confidence_score < 0.3 || analysis.fraud_indicators.length > 0) {
        return <Badge className="bg-red-100 text-red-800 border-red-300">Suspeito</Badge>;
      }
    }

    return <Badge variant="outline">Pendente</Badge>;
  };

  const getAIRecommendation = (doc: KYCDocument) => {
    if (!doc.kyc_ai_analysis || doc.kyc_ai_analysis.length === 0) return null;
    
    const analysis = doc.kyc_ai_analysis[0];
    const confidence = Math.round(analysis.confidence_score * 100);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Análise de IA</span>
          <Badge variant={confidence > 80 ? "default" : confidence > 50 ? "secondary" : "destructive"}>
            {confidence}% confiança
          </Badge>
        </div>
        
        {analysis.fraud_indicators.length > 0 && (
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Indicadores de fraude:</strong> {analysis.fraud_indicators.join(', ')}
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-sm text-muted-foreground">{analysis.recommendations}</p>
      </div>
    );
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const pendingCount = documents.filter(d => !d.is_verified && !d.notes).length;
  const approvedCount = documents.filter(d => d.is_verified).length;
  const rejectedCount = documents.filter(d => !d.is_verified && d.notes).length;
  const suspiciousCount = documents.filter(d => 
    d.kyc_ai_analysis && d.kyc_ai_analysis.length > 0 && 
    (d.kyc_ai_analysis[0].confidence_score < 0.3 || d.kyc_ai_analysis[0].fraud_indicators.length > 0)
  ).length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestão KYC Avançada</h1>
            <p className="text-muted-foreground">
              Gerencie documentos com análise de IA e ferramentas anti-fraude
            </p>
          </div>
          <Button onClick={fetchDocuments} variant="outline">
            Atualizar
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejeitados</p>
                  <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suspeitos</p>
                  <p className="text-2xl font-bold text-red-800">{suspiciousCount}</p>
                </div>
                <Shield className="h-8 w-8 text-red-800" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                  <SelectItem value="suspicious">Suspeitos</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="rg">RG</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="selfie">Selfie</SelectItem>
                  <SelectItem value="address_proof">Comprovante de Endereço</SelectItem>
                  <SelectItem value="criminal_background">Antecedentes Criminais</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }} variant="outline">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{doc.profiles?.full_name || 'Nome não informado'}</span>
                        <Badge variant="outline">{doc.user_roles?.role}</Badge>
                        {getStatusBadge(doc)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {doc.document_type.toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!doc.kyc_ai_analysis || doc.kyc_ai_analysis.length === 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runAIAnalysis(doc.id)}
                          disabled={analysisLoading === doc.id}
                        >
                          {analysisLoading === doc.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                          Analisar IA
                        </Button>
                      ) : null}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Revisar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Revisar Documento</DialogTitle>
                            <DialogDescription>
                              {doc.profiles?.full_name} - {doc.document_type.toUpperCase()}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            {/* Análise de IA */}
                            {getAIRecommendation(doc)}
                            
                            {/* Documento */}
                            <div className="space-y-2">
                              <h4 className="font-medium">Documento</h4>
                              <img
                                src={doc.file_url}
                                alt="Documento"
                                className="max-w-full h-auto border rounded-lg"
                              />
                            </div>
                            
                            {/* Notas existentes */}
                            {doc.notes && (
                              <div className="space-y-2">
                                <h4 className="font-medium">Notas existentes</h4>
                                <p className="text-sm bg-muted p-3 rounded">{doc.notes}</p>
                              </div>
                            )}
                            
                            {/* Ações */}
                            {!doc.is_verified && (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Motivo da ação</h4>
                                  <Textarea
                                    placeholder="Descreva o motivo da aprovação ou rejeição..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => approveDocument(doc.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    onClick={() => rejectDocument(doc.id)}
                                    variant="destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {/* Análise de IA resumida */}
                  {doc.kyc_ai_analysis && doc.kyc_ai_analysis.length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      {getAIRecommendation(doc)}
                    </div>
                  )}
                </div>
              ))}
              
              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum documento encontrado com os filtros aplicados.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminKYCEnhanced;