import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Clock, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/layout/MobileHeader';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import DashboardStats from '@/components/dashboard/DashboardStats';
import StatusCard from '@/components/ui/status-card';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  created_at: string;
  service_categories?: {
    name: string;
    color: string;
  };
  addresses?: {
    street: string;
    neighborhood: string;
    city: string;
  };
  profiles?: {
    full_name: string;
  };
}

const Dashboard = () => {
  const { user, userRole, profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchStats();
    }
  }, [user, activeTab]);

  const fetchJobs = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          service_categories(name, color),
          addresses(street, neighborhood, city),
          profiles!jobs_provider_id_fkey(full_name)
        `);

      if (userRole === 'client') {
        query = query.eq('client_id', user.id);
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id);
      }

      // Filter by status tab
      if (activeTab === 'open') {
        query = query.eq('status', 'open');
      } else if (activeTab === 'progress') {
        query = query.in('status', ['in_proposal', 'in_progress']);
      } else if (activeTab === 'delivered') {
        query = query.eq('status', 'delivered');
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'completed');
      } else if (activeTab === 'disputes') {
        query = query.eq('status', 'disputed');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setJobs((data as any) || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      let statsQuery;
      
      if (userRole === 'client') {
        const { data } = await supabase
          .from('jobs')
          .select('status, final_price')
          .eq('client_id', user.id);

        const activeJobs = data?.filter(j => ['in_progress', 'in_proposal'].includes(j.status)).length || 0;
        const completedJobs = data?.filter(j => j.status === 'completed').length || 0;
        const totalSpent = data?.filter(j => j.final_price).reduce((sum, j) => sum + (j.final_price || 0), 0) || 0;

        setStats({
          activeJobs,
          completedJobs,
          totalSpent,
          pendingProposals: data?.filter(j => j.status === 'in_proposal').length || 0
        });
      } else if (userRole === 'provider') {
        const { data } = await supabase
          .from('jobs')
          .select('status, final_price')
          .eq('provider_id', user.id);

        const activeJobs = data?.filter(j => ['in_progress'].includes(j.status)).length || 0;
        const completedJobs = data?.filter(j => j.status === 'completed').length || 0;
        const totalEarnings = data?.filter(j => j.final_price).reduce((sum, j) => sum + (j.final_price || 0), 0) || 0;

        setStats({
          activeJobs,
          completedJobs,
          totalEarnings,
          avgRating: profile?.rating_avg || 5.0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: 'bg-blue-500',
      in_proposal: 'bg-yellow-500',
      in_progress: 'bg-orange-500',
      delivered: 'bg-purple-500',
      completed: 'bg-green-500',
      cancelled: 'bg-gray-500',
      disputed: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      open: 'Aberto',
      in_proposal: 'Proposta Enviada',
      in_progress: 'Em Andamento',
      delivered: 'Entregue',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      disputed: 'Em Disputa'
    };
    return texts[status] || status;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <MobileHeader 
        title={userRole === 'provider' ? 'Meus Trabalhos' : 'Meus Jobs'}
        showNotifications
        notificationCount={3}
      />

      <div className="container-center section-padding">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Olá, {profile?.full_name || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'provider' 
              ? 'Gerencie seus trabalhos e acompanhe seus ganhos' 
              : 'Acompanhe seus projetos e encontre profissionais'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <DashboardStats userRole={userRole as 'client' | 'provider'} stats={stats} />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          {userRole === 'client' && (
            <Button
              onClick={() => navigate('/jobs/new')}
              variant="shipfy"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Trabalho
            </Button>
          )}
          {userRole === 'provider' && (
            <Button
              onClick={() => navigate('/discover')}
              variant="shipfy"
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Descobrir Jobs
            </Button>
          )}
        </div>

        {/* Jobs Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="open">Abertos</TabsTrigger>
            <TabsTrigger value="progress">Andamento</TabsTrigger>
            <TabsTrigger value="delivered">Entregues</TabsTrigger>
            <TabsTrigger value="completed">Finalizados</TabsTrigger>
            <TabsTrigger value="disputes">Disputas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando trabalhos...</p>
              </div>
            ) : jobs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum trabalho encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {userRole === 'client' 
                      ? 'Você ainda não tem trabalhos nesta categoria.' 
                      : 'Não há trabalhos disponíveis nesta categoria.'}
                  </p>
                  {userRole === 'client' && (
                    <Button onClick={() => navigate('/jobs/new')} variant="shipfy">
                      Criar Primeiro Trabalho
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} onClick={() => handleJobClick(job.id)}>
                    <StatusCard
                      title={job.title}
                      description={job.description}
                      status={job.status as any}
                      price={job.final_price || job.budget_max}
                      location={job.addresses ? `${job.addresses.neighborhood}, ${job.addresses.city}` : undefined}
                      timeAgo={formatTimeAgo(job.created_at)}
                      providerName={(job.profiles as any)?.full_name}
                      onAction={() => handleJobClick(job.id)}
                      actionLabel="Ver Detalhes"
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <MobileBottomNav 
        activeTab="home"
        userRole={userRole as 'client' | 'provider'}
        onTabChange={(tab) => {
          if (tab === 'discover') navigate('/discover');
          if (tab === 'profile') navigate('/profile');
          if (tab === 'messages') navigate('/messages');
        }}
      />
    </div>
  );
};

export default Dashboard;