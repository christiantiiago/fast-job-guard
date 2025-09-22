import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DigitalSignature } from '@/components/signature/DigitalSignature';
import { generateContractPDFBlob, uploadContractPDF } from '@/utils/pdfGenerator';
import { 
  FileText, 
  Download, 
  PenTool, 
  Check, 
  Clock, 
  Shield, 
  User, 
  Briefcase,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Contract {
  id: string;
  job_id: string;
  client_id: string;
  provider_id: string;
  proposal_id: string;
  agreed_price: number;
  agreed_deadline?: string;
  terms_and_conditions: string;
  status: string;
  client_signed: boolean;
  provider_signed: boolean;
  client_signature_data?: string;
  provider_signature_data?: string;
  client_signature_timestamp?: string;
  provider_signature_timestamp?: string;
  contract_pdf_url?: string;
  created_at: string;
  updated_at: string;
  jobs?: {
    title: string;
  } | null;
}

interface EnhancedContractViewProps {
  contract: Contract;
  onUpdate: () => void;
}

export function EnhancedContractView({ contract, onUpdate }: EnhancedContractViewProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [showSignature, setShowSignature] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [signatureRole, setSignatureRole] = useState<'client' | 'provider'>('client');

  const isClient = contract.client_id === user?.id;
  const canSign = (isClient && !contract.client_signed) || (!isClient && !contract.provider_signed);
  const bothSigned = contract.client_signed && contract.provider_signed;
  
  const clientName = 'Cliente';
  const providerName = 'Prestador';
  const jobTitle = contract.jobs?.title || 'Trabalho';

  const handleSignContract = async (signatureData: string) => {
    try {
      const updates: any = {};
      const timestamp = new Date().toISOString();

      if (isClient) {
        updates.client_signed = true;
        updates.client_signature_data = signatureData;
        updates.client_signature_timestamp = timestamp;
      } else {
        updates.provider_signed = true;
        updates.provider_signature_data = signatureData;
        updates.provider_signature_timestamp = timestamp;
      }

      // Update signature status
      updates.status = 'active';

      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: "Contrato assinado",
        description: "Sua assinatura foi registrada com sucesso",
      });

      onUpdate();
      
      // Generate PDF if both parties have signed
      if ((isClient && contract.provider_signed) || (!isClient && contract.client_signed)) {
        generatePDF();
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Erro",
        description: "Falha ao assinar o contrato. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);

      const pdfBlob = await generateContractPDFBlob({
        id: contract.id,
        job_title: jobTitle,
        client_name: clientName,
        provider_name: providerName,
        agreed_price: contract.agreed_price,
        agreed_deadline: contract.agreed_deadline,
        terms_and_conditions: contract.terms_and_conditions,
        client_signature_data: contract.client_signature_data,
        provider_signature_data: contract.provider_signature_data,
        client_signature_timestamp: contract.client_signature_timestamp,
        provider_signature_timestamp: contract.provider_signature_timestamp,
        created_at: contract.created_at
      });

      const pdfUrl = await uploadContractPDF(contract.id, pdfBlob);

      // Update contract with PDF URL
      await supabase
        .from('contracts')
        .update({ contract_pdf_url: pdfUrl })
        .eq('id', contract.id);

      toast({
        title: "PDF gerado",
        description: "Contrato disponível para download",
      });

      onUpdate();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadPDF = () => {
    if (contract.contract_pdf_url) {
      window.open(contract.contract_pdf_url, '_blank');
    }
  };

  const getStatusBadge = () => {
    if (bothSigned) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Assinado
        </Badge>
      );
    } else if (contract.client_signed || contract.provider_signed) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Parcialmente Assinado
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <AlertCircle className="h-3 w-3 mr-1" />
          Aguardando Assinaturas
        </Badge>
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrato - {jobTitle}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Contract Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Cliente:</span>
              <span>{clientName}</span>
              {contract.client_signed && <Check className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Prestador:</span>
              <span>{providerName}</span>
              {contract.provider_signed && <Check className="h-4 w-4 text-green-500" />}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Valor:</span>
              <span className="font-semibold text-green-600">
                R$ {contract.agreed_price.toFixed(2)}
              </span>
            </div>
            {contract.agreed_deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Prazo:</span>
                <span>{new Date(contract.agreed_deadline).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Terms and Conditions */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Termos e Condições
          </h4>
          <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
            {contract.terms_and_conditions}
          </div>
        </div>

        <Separator />

        {/* Signature Status */}
        <div>
          <h4 className="font-medium mb-4">Status das Assinaturas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${contract.client_signed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Cliente</span>
                {contract.client_signed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {contract.client_signed 
                  ? `Assinado em ${new Date(contract.client_signature_timestamp!).toLocaleString('pt-BR')}`
                  : 'Aguardando assinatura'
                }
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${contract.provider_signed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Prestador</span>
                {contract.provider_signed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {contract.provider_signed 
                  ? `Assinado em ${new Date(contract.provider_signature_timestamp!).toLocaleString('pt-BR')}`
                  : 'Aguardando assinatura'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {canSign && (
            <Button 
              onClick={() => {
                setSignatureRole(isClient ? 'client' : 'provider');
                setShowSignature(true);
              }}
              className="flex items-center gap-2"
            >
              <PenTool className="h-4 w-4" />
              Assinar Contrato
            </Button>
          )}

          {bothSigned && (
            <>
              {contract.contract_pdf_url ? (
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isGeneratingPDF ? 'Gerando PDF...' : 'Gerar PDF'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Digital Signature Modal */}
        <DigitalSignature
          isOpen={showSignature}
          onClose={() => setShowSignature(false)}
          onSignature={handleSignContract}
          title="Assinatura Digital do Contrato"
          description="Desenhe sua assinatura para confirmar o acordo dos termos"
          signerName={isClient ? clientName : providerName}
          signerRole={isClient ? 'Cliente' : 'Prestador de Serviços'}
        />
      </CardContent>
    </Card>
  );
}