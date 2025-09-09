import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Bell, 
  FileText, 
  Handshake, 
  DollarSign, 
  Clock, 
  User,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProposalNotification {
  id: string;
  job_id: string;
  provider_id: string;
  price: number;
  message: string;
  status: string;
  created_at: string;
  delivery_date?: string;
  estimated_hours?: number;
  jobs: {
    title: string;
    client_id: string;
  };
  profiles?: {
    full_name?: string;
  } | null;
}

interface CounterOfferNotification {
  id: string;
  proposal_id: string;
  offered_by: string;
  price: number;
  message: string;
  status: string;
  created_at: string;
  proposals: {
    job_id: string;
    jobs: {
      title: string;
      client_id: string;
    };
  };
}

export function ProposalNotifications() {
  const { user, userRole } = useAuth();
  const [proposals, setProposals] = useState<ProposalNotification[]>([]);
  const [counterOffers, setCounterOffers] = useState<CounterOfferNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (userRole === 'client') {
        // Fetch proposals for client's jobs
        const { data: proposalData } = await supabase
          .from('proposals')
          .select(`
            *,
            jobs!inner(title, client_id),
            profiles(full_name)
          `)
          .eq('jobs.client_id', user.id)
          .eq('status', 'sent')
          .order('created_at', { ascending: false })
          .limit(10);

        setProposals((proposalData as ProposalNotification[]) || []);

        // Fetch counter offers for client
        const { data: counterData } = await supabase
          .from('counter_offers')
          .select(`
            *,
            proposals!inner(
              job_id,
              jobs!inner(title, client_id)
            )
          `)
          .eq('proposals.jobs.client_id', user.id)
          .eq('offered_by', 'provider')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);

        setCounterOffers((counterData as any) || []);
      } else if (userRole === 'provider') {
        // Fetch counter offers made by clients to provider's proposals
        const { data: counterData } = await supabase
          .from('counter_offers')
          .select(`
            *,
            proposals!inner(
              provider_id,
              job_id,
              jobs!inner(title, client_id)
            )
          `)
          .eq('proposals.provider_id', user.id)
          .eq('offered_by', 'client')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);

        setCounterOffers((counterData as any) || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscriptions
    const proposalsChannel = supabase
      .channel('proposals-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals'
        },
        () => fetchNotifications()
      )
      .subscribe();

    const counterOffersChannel = supabase
      .channel('counter-offers-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counter_offers'
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(proposalsChannel);
      supabase.removeChannel(counterOffersChannel);
    };
  }, [user, userRole]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Carregando notificações...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (proposals.length === 0 && counterOffers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* New Proposals */}
      {proposals.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <FileText className="h-5 w-5" />
              Novas Propostas ({proposals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {proposal.profiles?.full_name?.charAt(0) || <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="font-medium">
                      <a href={`/profile/${proposal.provider_id}`} className="hover:text-primary transition-colors">
                        {proposal.profiles?.full_name || 'Prestador Anônimo'}
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground">{proposal.jobs.title}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(proposal.price)}
                      </span>
                      {proposal.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {proposal.estimated_hours}h
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(proposal.created_at)}</p>
                  </div>
                </div>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Link to={`/jobs/${proposal.job_id}`}>
                    Ver Proposta
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Counter Offers */}
      {counterOffers.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Handshake className="h-5 w-5" />
              Negociações Ativas ({counterOffers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {counterOffers.map((counterOffer) => (
              <div key={counterOffer.id} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium">
                    {userRole === 'client' ? 'Prestador fez contraproposta' : 'Cliente fez contraproposta'}
                  </p>
                  <p className="text-sm text-muted-foreground">{counterOffer.proposals.jobs.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">
                      Novo valor: {formatCurrency(counterOffer.price)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(counterOffer.created_at)}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                  <Link to={`/jobs/${counterOffer.proposals.job_id}`}>
                    Responder
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}