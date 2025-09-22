import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EscrowCard } from '@/components/escrow/EscrowCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Wallet,
  Calendar,
  ArrowUpRight
} from 'lucide-react';

interface EscrowPayment {
  id: string;
  amount: number;
  total_amount: number;
  platform_fee: number;
  status: string;
  release_date: string;
  created_at: string;
  completed_at?: string;
  job_id: string;
  client_id: string;
  provider_id: string;
  job?: {
    title: string;
  };
  client_profile?: {
    full_name: string;
  };
}

export default function FinanceEscrow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHeld: 0,
    totalReleased: 0,
    pendingCount: 0,
    releasedCount: 0
  });

  useEffect(() => {
    if (user) {
      fetchEscrowPayments();
    }
  }, [user]);

  const fetchEscrowPayments = async () => {
    try {
      setLoading(true);
      
      const { data: escrowData, error } = await supabase
        .from('escrow_payments')
        .select(`
          id,
          amount,
          total_amount,
          platform_fee,
          status,
          release_date,
          created_at,
          completed_at,
          job_id,
          client_id,
          provider_id
        `)
        .eq('provider_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching escrow payments:', error);
        return;
      }

      if (escrowData) {
        // Get job titles and client names
        const jobIds = escrowData.map(p => p.job_id).filter(Boolean);
        const clientIds = escrowData.map(p => p.client_id).filter(Boolean);
        
        let jobTitles: Record<string, string> = {};
        let clientNames: Record<string, string> = {};
        
        if (jobIds.length > 0) {
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title')
            .in('id', jobIds);
          
          jobTitles = (jobsData || []).reduce((acc, job) => {
            acc[job.id] = job.title;
            return acc;
          }, {} as Record<string, string>);
        }
        
        if (clientIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', clientIds);
          
          clientNames = (profilesData || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile.full_name || 'Cliente';
            return acc;
          }, {} as Record<string, string>);
        }
        
        const processedPayments = escrowData.map(payment => ({
          ...payment,
          job: {
            title: jobTitles[payment.job_id] || 'Trabalho removido'
          },
          client_profile: {
            full_name: clientNames[payment.client_id] || 'Cliente'
          }
        }));

        setEscrowPayments(processedPayments);
        calculateStats(processedPayments);
      }
    } catch (error) {
      console.error('Error fetching escrow payments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de escrow.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (payments: EscrowPayment[]) => {
    const totalHeld = payments
      .filter(p => p.status === 'held')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalReleased = payments
      .filter(p => p.status === 'released')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingCount = payments.filter(p => p.status === 'held').length;
    const releasedCount = payments.filter(p => p.status === 'released').length;

    setStats({
      totalHeld,
      totalReleased,
      pendingCount,
      releasedCount
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const heldPayments = escrowPayments.filter(p => p.status === 'held');
  const releasedPayments = escrowPayments.filter(p => p.status === 'released');

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pagamentos em Escrow</h1>
            <p className="text-muted-foreground">Gerencie seus pagamentos garantidos</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Garantia</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalHeld)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} pagamentos</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Liberado</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalReleased)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.releasedCount} pagamentos</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Recebido</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats.totalHeld + stats.totalReleased)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Valor bruto</p>
                </div>
                <Wallet className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transações</p>
                  <p className="text-2xl font-bold text-purple-600">{escrowPayments.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Escrow Payments */}
        <Tabs defaultValue="held" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="held" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Em Garantia ({stats.pendingCount})
            </TabsTrigger>
            <TabsTrigger value="released" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Liberados ({stats.releasedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="held" className="space-y-4">
            {heldPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum pagamento em garantia</h3>
                  <p className="text-muted-foreground">
                    Quando você receber pagamentos de clientes, eles aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {heldPayments.map((payment) => (
                  <div key={payment.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>📋 {payment.job?.title}</span>
                      <span>👤 {payment.client_profile?.full_name}</span>
                    </div>
                    <EscrowCard 
                      escrowPayment={payment} 
                      isClient={false}
                      onUpdate={fetchEscrowPayments}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="released" className="space-y-4">
            {releasedPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum pagamento liberado</h3>
                  <p className="text-muted-foreground">
                    Pagamentos liberados aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {releasedPayments.map((payment) => (
                  <div key={payment.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>📋 {payment.job?.title}</span>
                      <span>👤 {payment.client_profile?.full_name}</span>
                    </div>
                    <EscrowCard 
                      escrowPayment={payment} 
                      isClient={false}
                      onUpdate={fetchEscrowPayments}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        {stats.totalHeld > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">💰 Dinheiro em Garantia</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Você tem {formatCurrency(stats.totalHeld)} aguardando liberação pelos clientes.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={fetchEscrowPayments}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}