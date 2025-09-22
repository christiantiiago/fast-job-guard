import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedContractView } from '@/components/contracts/EnhancedContractView';
import { FileText, Scroll } from 'lucide-react';

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
    client_profile?: {
      full_name: string;
    };
    provider_profile?: {
      full_name: string;
    };
  };
}

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          jobs(
            title,
            client_profile:profiles!client_id(full_name),
            provider_profile:profiles!provider_id(full_name)
          )
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        return;
      }

      setContracts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container-center py-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Scroll className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Contratos</h1>
          </div>
          {contracts.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {contracts.length} contratos
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground text-center">
                Os contratos aparecerão aqui após a confirmação de pagamentos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {contracts.map((contract) => (
              <EnhancedContractView
                key={contract.id}
                contract={contract}
                onUpdate={fetchContracts}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}