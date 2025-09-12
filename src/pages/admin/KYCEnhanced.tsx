import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  User, 
  AlertTriangle,
  Search,
  Eye,
  UserX
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  is_verified: boolean;
  created_at: string;
  verified_at?: string;
  verified_by?: string;
  notes?: string;
  file_name?: string;
  user_profile?: {
    full_name: string;
    document_number: string;
    kyc_status: string;
  } | null;
}

const DOCUMENT_TYPE_LABELS = {
  rg: 'RG',
  cpf: 'CPF', 
  selfie: 'Selfie com Documento',
  address_proof: 'Comprovante de Residência',
  bank_info: 'Dados Bancários',
  criminal_background: 'Certidão de Antecedentes'
};

const KYC_STATUS_LABELS = {
  incomplete: 'Incompleto',
  em_analise: 'Em Análise',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  bloqueado: 'Bloqueado',
  suspeito: 'Suspeito'
};

export default function KYCEnhanced() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          user_profile:profiles!kyc_documents_user_id_fkey (
            full_name,
            document_number,
            kyc_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDocuments((data as any[])?.map(doc => ({
        ...doc,
        user_profile: doc.user_profile || null
      })) || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async (documentId: string, notes?: string) => {
    if (!user?.id) return;
    
    try {
      setActionLoading(true);
      
      const { error } = await supabase.rpc('approve_kyc_document_manual', {
        document_id: documentId,
        admin_user_id: user.id,
        approval_notes: notes || null
      });

      if (error) throw error;
      
      toast({
        title: "Documento aprovado",
        description: "O documento foi aprovado com sucesso.",
      });
      
      setSelectedDocument(null);
      setApprovalNotes('');
      await fetchDocuments();
    } catch (error) {
      console.error('Erro ao aprovar documento:', error);
      toast({
        title: "Erro ao aprovar documento",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const rejectDocument = async (documentId: string, reason: string) => {
    if (!user?.id || !reason.trim()) return;
    
    try {
      setActionLoading(true);
      
      const { error } = await supabase.rpc('reject_kyc_document_manual', {
        document_id: documentId,
        admin_user_id: user.id,
        rejection_reason: reason
      });

      if (error) throw error;
      
      toast({
        title: "Documento rejeitado",
        description: "O documento foi rejeitado. O usuário pode reenviar.",
      });
      
      setSelectedDocument(null);
      setRejectionReason('');
      await fetchDocuments();
    } catch (error) {
      console.error('Erro ao rejeitar documento:', error);
      toast({
        title: "Erro ao rejeitar documento",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user_profile?.document_number?.includes(searchTerm) ||
      DOCUMENT_TYPE_LABELS[doc.document_type as keyof typeof DOCUMENT_TYPE_LABELS]?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && !doc.is_verified && !doc.notes) ||
      (statusFilter === 'approved' && doc.is_verified) ||
      (statusFilter === 'rejected' && !doc.is_verified && doc.notes);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (doc: KYCDocument) => {
    if (doc.is_verified) {
      return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
    } else if (doc.notes) {
      return <Badge variant="destructive">Rejeitado</Badge>;
    } else {
      return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getStatusIcon = (doc: KYCDocument) => {
    if (doc.is_verified) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (doc.notes) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const statsData = {
    total: documents.length,
    pending: documents.filter(d => !d.is_verified && !d.notes).length,
    approved: documents.filter(d => d.is_verified).length,
    rejected: documents.filter(d => !d.is_verified && d.notes).length
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão KYC</h1>
            <p className="text-muted-foreground">
              Analise e aprove documentos de verificação de identidade
            </p>
          </div>
          <Button onClick={fetchDocuments} disabled={loading}>
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{statsData.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{statsData.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{statsData.approved}</p>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{statsData.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejeitados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, documento ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendentes</option>
                  <option value="approved">Aprovados</option>
                  <option value="rejected">Rejeitados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="p-4 text-center">Carregando...</div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum documento encontrado
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedDocument?.id === doc.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(doc)}
                              <span className="font-medium">
                                {DOCUMENT_TYPE_LABELS[doc.document_type as keyof typeof DOCUMENT_TYPE_LABELS]}
                              </span>
                              {getStatusBadge(doc)}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {doc.user_profile?.full_name || 'Nome não informado'}
                              </p>
                              <p>
                                {formatDistanceToNow(new Date(doc.created_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </p>
                              {doc.user_profile?.kyc_status && (
                                <Badge variant="outline" className="text-xs">
                                  {KYC_STATUS_LABELS[doc.user_profile.kyc_status as keyof typeof KYC_STATUS_LABELS]}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Documento</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDocument ? (
                <div className="space-y-4">
                  {/* Document Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      {DOCUMENT_TYPE_LABELS[selectedDocument.document_type as keyof typeof DOCUMENT_TYPE_LABELS]}
                    </h3>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedDocument)}
                      {getStatusBadge(selectedDocument)}
                    </div>
                  </div>

                  <Separator />

                  {/* User Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Informações do Usuário</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Nome:</strong> {selectedDocument.user_profile?.full_name || 'N/A'}</p>
                      <p><strong>Documento:</strong> {selectedDocument.user_profile?.document_number || 'N/A'}</p>
                      <p><strong>Status KYC:</strong> {selectedDocument.user_profile?.kyc_status ? KYC_STATUS_LABELS[selectedDocument.user_profile.kyc_status as keyof typeof KYC_STATUS_LABELS] : 'N/A'}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Document Image */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Visualizar Documento</h4>
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <img 
                        src={selectedDocument.file_url} 
                        alt="Documento" 
                        className="w-full max-h-64 object-contain rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<p class="text-center text-muted-foreground">Erro ao carregar imagem</p>';
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Notes */}
                  {selectedDocument.notes && (
                    <>
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-600">Motivo da Rejeição</h4>
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{selectedDocument.notes}</AlertDescription>
                        </Alert>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Actions */}
                  {!selectedDocument.is_verified && (
                    <div className="space-y-4">
                      {/* Approval Section */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Aprovar Documento</h4>
                        <Textarea
                          placeholder="Notas de aprovação (opcional)..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                        />
                        <Button
                          onClick={() => approveDocument(selectedDocument.id, approvalNotes)}
                          disabled={actionLoading}
                          className="w-full"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar Documento
                        </Button>
                      </div>

                      <Separator />

                      {/* Rejection Section */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Rejeitar Documento</h4>
                        <Textarea
                          placeholder="Motivo da rejeição (obrigatório)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <Button
                          variant="destructive"
                          onClick={() => rejectDocument(selectedDocument.id, rejectionReason)}
                          disabled={actionLoading || !rejectionReason.trim()}
                          className="w-full"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar Documento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Selecione um documento para visualizar os detalhes
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}