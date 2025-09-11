import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useBackgroundJobProcessor } from '@/hooks/useBackgroundJobProcessor';
import { 
  CheckCircle, XCircle, Clock, Search, Filter,
  Eye, AlertTriangle, Shield, FileText, User, Calendar, Brain
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
  verified_at?: string | null;
  verified_by?: string | null;
  profiles: { full_name: string | null; phone: string | null; kyc_status: string; } | null;
  user_roles: { role: string; } | null;
  kyc_ai_analysis?: { id: string; confidence_score: number; fraud_indicators: string[]; recommendations: string; processed_at: string; }[];
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
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Processamento automático de jobs em background
  useBackgroundJobProcessor();

  // Buscar documentos do Supabase
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (kycError) throw kycError;

      const { data: aiAnalyses } = await supabase
        .from('kyc_ai_analysis')
        .select('*');

      const documentsWithUserInfo = await Promise.all(
        (kycData || []).map(async doc => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone, kyc_status')
            .eq('user_id', doc.user_id)
            .single();
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', doc.user_id)
            .single();
          const docAIAnalyses = aiAnalyses?.filter(ai => ai.document_id === doc.id) || [];
          return { ...doc, profiles: profileData, user_roles: roleData, kyc_ai_analysis: docAIAnalyses };
        })
      );

      setDocuments(documentsWithUserInfo as any);
      setFilteredDocuments(documentsWithUserInfo as any);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os documentos.", variant: "destructive" });
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
      if (statusFilter === 'pending') filtered = filtered.filter(doc => !doc.is_verified && !doc.notes);
      else if (statusFilter === 'approved') filtered = filtered.filter(doc => doc.is_verified);
      else if (statusFilter === 'rejected') filtered = filtered.filter(doc => !doc.is_verified && doc.notes);
      else if (statusFilter === 'suspicious') filtered = filtered.filter(doc =>
        doc.kyc_ai_analysis && doc.kyc_ai_analysis.length > 0 &&
        (doc.kyc_ai_analysis[0].confidence_score < 0.3 || doc.kyc_ai_analysis[0].fraud_indicators.length > 0)
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter(doc => doc.document_type === typeFilter);
    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter, typeFilter]);

  useEffect(() => { fetchDocuments(); }, []);

  if (loading) return <AppLayout><p className="text-center py-10">Carregando documentos...</p></AppLayout>;

  const getStatusBadge = (doc: KYCDocument) => {
    if (doc.is_verified) return <Badge className="bg-green-100 text-green-800 border-green-300">Aprovado</Badge>;
    if (doc.notes) return <Badge variant="destructive">Rejeitado</Badge>;
    const hasAIAnalysis = doc.kyc_ai_analysis && doc.kyc_ai_analysis.length > 0;
    if (hasAIAnalysis && (doc.kyc_ai_analysis![0].confidence_score < 0.3 || doc.kyc_ai_analysis![0].fraud_indicators.length > 0))
      return <Badge className="bg-red-100 text-red-800 border-red-300">Suspeito</Badge>;
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
          <Badge variant={confidence > 80 ? "default" : confidence > 50 ? "secondary" : "destructive"}>{confidence}% confiança</Badge>
        </div>
        {analysis.fraud_indicators.length > 0 && (
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm"><strong>Indicadores de fraude:</strong> {analysis.fraud_indicators.join(', ')}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">{analysis.recommendations}</p>
      </div>
    );
  };

  // Contagem de status
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
            <p className="text-muted-foreground">Gerencie documentos com análise de IA e ferramentas anti-fraude</p>
          </div>
          <Button onClick={fetchDocuments} variant="outline">Atualizar</Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4 flex justify-between items-center"><span>Pendentes: {pendingCount}</span><Clock /></CardContent></Card>
          <Card><CardContent className="p-4 flex justify-between items-center"><span>Aprovados: {approvedCount}</span><CheckCircle /></CardContent></Card>
          <Card><CardContent className="p-4 flex justify-between items-center"><span>Rejeitados: {rejectedCount}</span><XCircle /></CardContent></Card>
          <Card><CardContent className="p-4 flex justify-between items-center"><span>Suspeitos: {suspiciousCount}</span><Shield /></CardContent></Card>
        </div>

        {/* Lista de documentos simplificada */}
        <Card>
          <CardHeader><CardTitle>Documentos ({filteredDocuments.length})</CardTitle></CardHeader>
          <CardContent>
            {filteredDocuments.map(doc => (
              <div key={doc.id} className="border p-3 rounded mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p><strong>{doc.profiles?.full_name || 'Nome não informado'}</strong> - {doc.document_type}</p>
                    {getStatusBadge(doc)}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setSelectedDocument(doc)}>Revisar</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Documento</DialogTitle></DialogHeader>
                      <div>
                        <img src={doc.file_url} className="max-h-96 mx-auto" />
                        {getAIRecommendation(doc)}
                        <Textarea placeholder="Notas..." value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            {filteredDocuments.length === 0 && <p className="text-center py-4">Nenhum documento encontrado.</p>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminKYCEnhanced;
