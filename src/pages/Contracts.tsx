import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  PenLine,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useContractSync } from '@/hooks/useContractSync';

interface Contract {
  id: string;
  job_title: string;
  client_name: string;
  provider_name: string;
  agreed_price: number;
  agreed_deadline: string;
  status: string;
  created_at: string;
  client_signed: boolean;
  provider_signed: boolean;
  terms_and_conditions: string;
  escrow_amount: number;
  job_address: string;
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize contract sync
  useContractSync();

  useEffect(() => {
    fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      // First try to get contracts directly
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          job_id,
          client_id,
          provider_id,
          agreed_price,
          agreed_deadline,
          status,
          created_at,
          client_signed,
          provider_signed,
          terms_and_conditions,
          escrow_amount
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Also check for jobs with escrow payments that should have contracts but don't
      const { data: escrowJobs, error: escrowError } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          job_id,
          client_id,
          provider_id,
          amount,
          status,
          created_at
        `)
        .eq('status', 'held')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (escrowError) {
        console.error('Error fetching escrow jobs:', escrowError);
      }

      // Get job titles for escrow payments
      let jobTitles = {};
      if (escrowJobs && escrowJobs.length > 0) {
        const jobIds = escrowJobs.map(e => e.job_id).filter(Boolean);
        if (jobIds.length > 0) {
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title')
            .in('id', jobIds);
          
          if (jobsData) {
            jobTitles = Object.fromEntries(jobsData.map(j => [j.id, j.title]));
          }
        }
      }

      // Combine data from both sources
      let allContracts = contractsData || [];

      // Add missing contracts from escrow payments
      if (escrowJobs) {
        for (const escrow of escrowJobs) {
          const existingContract = allContracts.find(c => c.job_id === escrow.job_id);
          if (!existingContract) {
            // Create a virtual contract from escrow data
            allContracts.push({
              id: `virtual-${escrow.id}`,
              job_id: escrow.job_id,
              client_id: escrow.client_id,
              provider_id: escrow.provider_id,
              agreed_price: escrow.amount,
              agreed_deadline: null,
              status: 'active',
              created_at: escrow.created_at,
              client_signed: true, // Auto-signed since payment was made
              provider_signed: true, // Auto-signed since work started
              terms_and_conditions: `CONTRATO AUTOMÁTICO - GERADO PELO PAGAMENTO
              
Serviço: ${jobTitles[escrow.job_id] || 'Serviço contratado'}
Valor: R$ ${escrow.amount?.toFixed(2).replace('.', ',') || '0,00'}
Status do Pagamento: Em garantia

Este contrato foi gerado automaticamente quando o pagamento foi confirmado.
O valor está protegido em garantia e será liberado após a conclusão do serviço.`,
              escrow_amount: escrow.amount
            });
          }
        }
      }

      // Now fetch related data for all contracts
      const contractIds = allContracts.map(c => c.job_id).filter(Boolean);
      const clientIds = [...new Set(allContracts.map(c => c.client_id))];
      const providerIds = [...new Set(allContracts.map(c => c.provider_id))];

      // Fetch jobs data
      const { data: jobsData } = contractIds.length > 0 ? await supabase
        .from('jobs')
        .select(`
          id,
          title,
          addresses!inner(
            street,
            number,
            neighborhood,
            city,
            state
          )
        `)
        .in('id', contractIds) : { data: [] };

      // Fetch profiles data
      const { data: profilesData } = [...clientIds, ...providerIds].length > 0 ? await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', [...clientIds, ...providerIds]) : { data: [] };

      const formattedContracts = allContracts.map((contract) => {
        // Find related job data
        const jobData = jobsData?.find(j => j.id === contract.job_id);
        const address = jobData?.addresses?.[0];

        // Find client and provider data
        const clientProfile = profilesData?.find(p => p.user_id === contract.client_id);
        const providerProfile = profilesData?.find(p => p.user_id === contract.provider_id);

        return {
          id: contract.id,
          job_title: jobData?.title || contract.terms_and_conditions?.includes('Serviço: ') 
            ? contract.terms_and_conditions.split('Serviço: ')[1]?.split('\n')[0] || 'Título não disponível'
            : 'Título não disponível',
          client_name: clientProfile?.full_name || 'Cliente',
          provider_name: providerProfile?.full_name || 'Prestador',
          agreed_price: contract.agreed_price || 0,
          agreed_deadline: contract.agreed_deadline,
          status: contract.status || 'active',
          created_at: contract.created_at,
          client_signed: contract.client_signed || false,
          provider_signed: contract.provider_signed || false,
          terms_and_conditions:
            contract.terms_and_conditions ||
            `CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n
1. O prestador se compromete a realizar o serviço descrito no título do trabalho.
2. O cliente concorda em pagar o valor acordado de R$ ${(contract.agreed_price || 0).toFixed(2).replace('.', ',')}.
3. O valor ficará retido em ESCROW até a conclusão do serviço.
4. A plataforma atua apenas como intermediadora e não se responsabiliza por falhas na execução do serviço.
5. Em caso de disputa, ambas as partes devem apresentar evidências, e a plataforma decidirá sobre a liberação do valor.
6. Este contrato é válido e foi aceito automaticamente com o pagamento.`,
          escrow_amount: contract.escrow_amount || contract.agreed_price || 0,
          job_address: address
            ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}`
            : 'Endereço não disponível',
        };
      });

      setContracts(formattedContracts);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os contratos.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async (contractId: string, role: 'client' | 'provider') => {
    try {
      const fieldToUpdate = role === 'client' ? 'client_signed' : 'provider_signed';
      const { error } = await supabase.from('contracts').update({ [fieldToUpdate]: true }).eq('id', contractId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Assinatura registrada com sucesso.',
      });

      fetchContracts();
    } catch (error) {
      console.error('Erro ao assinar contrato:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível registrar a assinatura.',
      });
    }
  };

  const getStatusBadge = (status: string, clientSigned: boolean, providerSigned: boolean) => {
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelado</Badge>;
    }

    if (!clientSigned || !providerSigned) {
      return <Badge variant="secondary">Aguardando Assinatura</Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Meus Contratos</h1>
            <p className="text-muted-foreground">Gerencie e visualize todos os seus contratos de serviço</p>
          </div>

          {contracts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
                <p className="text-muted-foreground">
                  Você ainda não possui contratos. Eles são criados automaticamente quando uma proposta é aceita.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {contracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{contract.job_title}</CardTitle>
                        <CardDescription>Contrato #{contract.id.slice(0, 8)}</CardDescription>
                      </div>
                      {getStatusBadge(contract.status, contract.client_signed, contract.provider_signed)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Contract Details */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Cliente:</strong> {contract.client_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Prestador:</strong> {contract.provider_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Local:</strong> {contract.job_address}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Valor:</strong> {formatCurrency(contract.agreed_price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Prazo:</strong> {formatDate(contract.agreed_deadline)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Criado em:</strong> {formatDate(contract.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Signature Status */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-3">Status das Assinaturas</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          {contract.client_signed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            Cliente {contract.client_signed ? 'assinou' : 'não assinou'}
                          </span>
                          {!contract.client_signed && user && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSignContract(contract.id, 'client')}
                            >
                              <PenLine className="h-3 w-3 mr-1" />
                              Assinar
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {contract.provider_signed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            Prestador {contract.provider_signed ? 'assinou' : 'não assinou'}
                          </span>
                          {!contract.provider_signed && user && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSignContract(contract.id, 'provider')}
                            >
                              <PenLine className="h-3 w-3 mr-1" />
                              Assinar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Escrow Information */}
                    {contract.escrow_amount > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">Valor em Escrow</span>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {formatCurrency(contract.escrow_amount)} está protegido em nossa garantia e será liberado
                          após a conclusão do serviço.
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedContract(contract)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar Completo
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Contract Detail Modal */}
          {selectedContract && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Detalhes do Contrato</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedContract(null)}>
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">{selectedContract.job_title}</h3>
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                      {selectedContract.terms_and_conditions}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
