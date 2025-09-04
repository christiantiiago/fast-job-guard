import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  MapPin,
  Star,
  Shield
} from 'lucide-react';

interface PlatformStats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalRevenue: number;
  averageRating: number;
  citiesServed: number;
  securityScore: number;
}

export default function StatsSection() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalRevenue: 0,
    averageRating: 0,
    citiesServed: 0,
    securityScore: 98
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    try {
      // Buscar estatísticas em paralelo
      const [profilesResult, jobsResult, paymentsResult, reviewsResult] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('status, final_price'),
        supabase.from('payments').select('amount, status').eq('status', 'released'),
        supabase.from('reviews').select('rating').eq('is_public', true)
      ]);

      const totalUsers = profilesResult.count || 0;
      const jobs = jobsResult.data || [];
      const payments = paymentsResult.data || [];
      const reviews = reviewsResult.data || [];

      // Calcular estatísticas
      const activeJobs = jobs.filter(job => job.status === 'in_progress').length;
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const totalRevenue = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      setStats({
        totalUsers,
        totalJobs: jobs.length,
        activeJobs,
        completedJobs,
        totalRevenue,
        averageRating,
        citiesServed: Math.min(50, Math.floor(totalUsers / 10)), // Estimativa
        securityScore: 98
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    description, 
    color = "text-primary",
    loading: cardLoading = false 
  }: {
    icon: any;
    title: string;
    value: string | number;
    description: string;
    color?: string;
    loading?: boolean;
  }) => (
    <Card className="hover:shadow-lg transition-all duration-300 group border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color} group-hover:scale-110 transition-transform`} />
      </CardHeader>
      <CardContent>
        {cardLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Estatísticas da Plataforma
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Números que Impressionam
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Veja como nossa plataforma está transformando o mercado de serviços domésticos
            com segurança, confiança e tecnologia de ponta.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            title="Usuários Ativos"
            value={stats.totalUsers.toLocaleString()}
            description="+15% este mês"
            color="text-blue-600"
            loading={loading}
          />
          
          <StatCard
            icon={Briefcase}
            title="Trabalhos Realizados"
            value={stats.completedJobs.toLocaleString()}
            description={`${stats.activeJobs} em andamento`}
            color="text-green-600"
            loading={loading}
          />
          
          <StatCard
            icon={DollarSign}
            title="Volume Transacionado"
            value={formatCurrency(stats.totalRevenue)}
            description="Pagamentos seguros"
            color="text-emerald-600"
            loading={loading}
          />
          
          <StatCard
            icon={Star}
            title="Avaliação Média"
            value={stats.averageRating.toFixed(1)}
            description="De satisfação dos clientes"
            color="text-yellow-600"
            loading={loading}
          />
        </div>

        {/* Estatísticas Secundárias */}
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <StatCard
            icon={MapPin}
            title="Cidades Atendidas"
            value={stats.citiesServed}
            description="Em todo o Brasil"
            color="text-purple-600"
            loading={loading}
          />
          
          <StatCard
            icon={Shield}
            title="Score de Segurança"
            value={`${stats.securityScore}%`}
            description="KYC e verificações"
            color="text-red-600"
            loading={loading}
          />
          
          <StatCard
            icon={TrendingUp}
            title="Taxa de Sucesso"
            value="97%"
            description="Jobs concluídos com sucesso"
            color="text-indigo-600"
            loading={loading}
          />
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-2">
                Faça Parte Dessa Transformação
              </h3>
              <p className="text-muted-foreground mb-4">
                Junte-se a milhares de prestadores e clientes que confiam na nossa plataforma
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Badge variant="outline" className="px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  100% Seguro
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <Shield className="w-3 h-3 mr-1" />
                  KYC Verificado
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <Clock className="w-3 h-3 mr-1" />
                  24/7 Suporte
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}