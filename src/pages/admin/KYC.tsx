import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, Clock, User, FileText, Camera, Home, Receipt } from 'lucide-react';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  is_verified: boolean;
  notes?: string;
  created_at: string;
  verified_at?: string;
  verified_by?: string;
  profiles?: {
    full_name: string;
    user_id: string;
  };
  user_roles?: {
    role: string;
  };
}

const DOCUMENT_ICONS = {
  rg: FileText,
  cpf: FileText,
  selfie: Camera,
  address_proof: Home,
  bank_info: Receipt,
  criminal_background: Receipt
};

const DOCUMENT_LABELS = {
  rg: 'RG',
  cpf: 'CPF',
  selfie: 'Selfie',
  address_proof: 'Comprovante de Residência',
  bank_info: 'Dados Bancários',
  criminal_background: 'Antecedentes Criminais'
};

export default function AdminKYC() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          profiles (
            full_name,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Buscar roles separadamente
      const documentsWithRoles = await Promise.all(
        (data || []).map(async (doc) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', doc.user_id)
            .single();
          
          return {
            ...doc,
            user_roles: roleData
          };
        })
      );

      setDocuments(documentsWithRoles as any);
    } catch (error: any) {
      console.error('Erro ao buscar documentos:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async (docId: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', docId);

      if (error) {
        throw error;
      }

      toast({
        title: "Documento aprovado",
        description: "O documento foi aprovado com sucesso.",
      });

      await fetchDocuments();
      setSelectedDoc(null);
      setNotes('');
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar documento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const rejectDocument = async (docId: string) => {
    if (!notes.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          is_verified: false,
          verified_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', docId);

      if (error) {
        throw error;
      }

      toast({
        title: "Documento rejeitado",
        description: "O documento foi rejeitado.",
      });

      await fetchDocuments();
      setSelectedDoc(null);
      setNotes('');
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar documento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const pendingDocs = documents.filter(doc => !doc.is_verified && !doc.notes);
  const approvedDocs = documents.filter(doc => doc.is_verified);
  const rejectedDocs = documents.filter(doc => !doc.is_verified && doc.notes);

  const DocumentCard = ({ doc }: { doc: KYCDocument }) => {
    const Icon = DOCUMENT_ICONS[doc.document_type as keyof typeof DOCUMENT_ICONS] || FileText;
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <CardTitle className="text-sm">
                {DOCUMENT_LABELS[doc.document_type as keyof typeof DOCUMENT_LABELS]}
              </CardTitle>
            </div>
            <Badge variant={
              doc.is_verified ? 'default' : 
              doc.notes ? 'destructive' : 'secondary'
            }>
              {doc.is_verified ? 'Aprovado' : 
               doc.notes ? 'Rejeitado' : 'Pendente'}
            </Badge>
          </div>
          <CardDescription className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {doc.profiles?.full_name || 'Usuário sem nome'} 
            <span className="text-xs">
              ({(doc.user_roles as any)?.role === 'provider' ? 'Prestador' : 'Cliente'})
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Enviado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs">Arquivo: {doc.file_name}</p>
            {doc.notes && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                <strong>Observações:</strong> {doc.notes}
              </div>
            )}
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setNotes(doc.notes || '');
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>
                      {DOCUMENT_LABELS[doc.document_type as keyof typeof DOCUMENT_LABELS]} - {doc.profiles?.full_name}
                    </DialogTitle>
                    <DialogDescription>
                      Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Preview do documento */}
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
                        <img
                          src={doc.file_url}
                          alt="Documento"
                          className="max-w-full h-auto max-h-96 mx-auto rounded"
                        />
                      )}
                    </div>

                    {/* Campo de observações */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Adicione observações sobre o documento..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    {!doc.is_verified && (
                      <>
                        <Button
                          variant="destructive"
                          onClick={() => rejectDocument(doc.id)}
                          disabled={processing}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                        <Button
                          onClick={() => approveDocument(doc.id)}
                          disabled={processing}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar KYC</h1>
            <p className="text-muted-foreground">
              Aprovar ou rejeitar documentos de verificação de identidade
            </p>
          </div>
          <Button onClick={fetchDocuments} variant="outline">
            Atualizar
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingDocs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aprovados
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedDocs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rejeitados
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedDocs.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Abas */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pendentes ({pendingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovados ({approvedDocs.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejeitados ({rejectedDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingDocs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">Nenhum documento pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedDocs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">Nenhum documento aprovado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvedDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedDocs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <XCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">Nenhum documento rejeitado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rejectedDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}