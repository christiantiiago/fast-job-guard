import { PromoCarousel } from './PromoCarousel';
import { HighlightSection } from './HighlightSection';
import { JobCard } from './JobCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Gift, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Car, 
  Bike, 
  Plus, 
  Clock,
  DollarSign,
  Star,
  AlertTriangle
} from 'lucide-react';

interface JobFastHomepageProps {
  userRole: 'client' | 'provider';
}

export function JobFastHomepage({ userRole }: JobFastHomepageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar dados do cliente
  const { data: clientStats } = useQuery({
    queryKey: ['client-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [jobsQuery, paymentsQuery] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, status, created_at')
          .eq('client_id', user.id),
        supabase
          .from('payments')
          .select('amount, status')
          .eq('client_id', user.id)
      ]);

      const suspiciousJobs = jobsQuery.data?.filter(job => {
        // Considerar suspeito se foi criado nas últimas 24h e ainda não teve propostas
        const isRecent = new Date(job.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        return isRecent && job.status === 'open';
      }) || [];

      return {
        totalJobs: jobsQuery.data?.length || 0,
        suspiciousJobs: suspiciousJobs.length,
        avgRating: 4.5, // Mock rating for now
        totalSpent: paymentsQuery.data?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0,
        recentReviews: [] // Mock empty reviews for now
      };
    },
    enabled: !!user?.id && userRole === 'client'
  });

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case '1': // Criar Job
        navigate('/jobs/new');
        break;
      case '2': // Urgente - Trabalhos suspeitos
        if (clientStats?.suspiciousJobs === 0) {
          toast.success('Nenhum trabalho suspeito encontrado! 🎉');
        } else {
          toast.info(`${clientStats?.suspiciousJobs || 0} trabalhos precisam de atenção`, {
            description: 'Jobs recentes sem propostas podem precisar de ajustes',
            action: {
              label: 'Ver Jobs',
              onClick: () => navigate('/jobs')
            }
          });
        }
        break;
      case '3': // Orçamento
        const totalSpent = clientStats?.totalSpent || 0;
        toast.info(`Total gasto: R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
          description: 'Controle seus gastos na plataforma',
          action: {
            label: 'Ver Detalhes',
            onClick: () => navigate('/wallet')
          }
        });
        break;
      case '4': // Avaliações
        const avgRating = clientStats?.avgRating || 0;
        const reviewCount = clientStats?.recentReviews?.length || 0;
        toast.info(`Sua avaliação: ${avgRating.toFixed(1)} ⭐`, {
          description: 'Veja todas suas avaliações',
          action: {
            label: 'Ver Avaliações',
            onClick: () => navigate('/reviews')
          }
        });
        break;
      default:
        console.log('Ação não implementada:', actionId);
    }
  };

  const providerHighlights = [
    { id: '1', title: 'Vale Gasolina', icon: Gift, color: 'primary' as const, isNew: true },
    { id: '2', title: 'Novidade!', icon: Star, color: 'accent' as const, isNew: true },
    { id: '3', title: 'Repasse semanal', icon: Calendar, color: 'secondary' as const },
    { id: '4', title: 'Evite bloqueios', icon: Shield, color: 'primary' as const }
  ];

  const clientHighlights = [
    { id: '1', title: 'Criar Job', icon: Plus, color: 'primary' as const },
    { id: '2', title: 'Urgente', icon: AlertTriangle, color: 'accent' as const, isNew: clientStats?.suspiciousJobs > 0 },
    { id: '3', title: 'Orçamento', icon: DollarSign, color: 'secondary' as const },
    { id: '4', title: 'Avaliações', icon: Star, color: 'primary' as const }
  ];

  if (userRole === 'provider') {
    return (
      <div className="p-4 space-y-6 pb-24">
        {/* Promo Carousel */}
        <PromoCarousel userRole={userRole} />

        {/* Highlights */}
        <HighlightSection
          title="Destaques"
          items={providerHighlights}
          onItemClick={(item) => console.log('Clicked:', item.title)}
        />

        {/* Jobs Near You */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Jobs perto de você</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <JobCard
              title="Novos"
              subtitle="jobs agora!"
              color="red"
              buttonText="Ver"
              badge="Novo"
            />
            
            <JobCard
              title="Jobs de"
              subtitle="Carro"
              description="perto de você."
              color="green"
              buttonText="Ver"
            />
            
            <JobCard
              title="Veja jobs de"
              subtitle="Moto"
              color="blue"
              buttonText="Ver"
            />
            
            <JobCard
              title="Hoje"
              subtitle="tem bônus!"
              description="O bônus #SegundaNa Job Fast está valendo. Bora ganhar!"
              color="orange"
              buttonText="Ver"
              badge="Bônus"
            />
          </div>
        </div>

        {/* Por dentro da Job Fast */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Por dentro da Job Fast</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <JobCard
              title="Seus"
              subtitle="jobs valem"
              color="blue"
              buttonText="Ver"
            />
            
            <JobCard
              title="Entregue no"
              subtitle="mesmo dia!"
              description="Ganhe entregas na Job Fast!"
              color="orange"
              buttonText="Ver"
            />
          </div>
        </div>
      </div>
    );
  }

  // Client homepage
    return (
      <div className="p-4 space-y-6 pb-24">
        {/* Promo Carousel */}
        <PromoCarousel userRole={userRole} />

      {/* Highlights */}
      <HighlightSection
        title="Ações Rápidas"
        items={clientHighlights}
        onItemClick={(item) => handleQuickAction(item.id)}
      />

      {/* Services Near You */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Serviços perto de você</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <JobCard
            title="Serviços"
            subtitle="domésticos"
            color="red"
            buttonText="Ver"
            badge="Popular"
          />
          
          <JobCard
            title="Técnicos"
            subtitle="especializados"
            description="Eletricistas, encanadores e mais"
            color="green"
            buttonText="Ver"
          />
          
          <JobCard
            title="Entrega"
            subtitle="expressa"
            color="blue"
            buttonText="Ver"
          />
          
          <JobCard
            title="Hoje"
            subtitle="desconto!"
            description="20% OFF na primeira contratação"
            color="orange"
            buttonText="Ver"
            badge="Oferta"
          />
        </div>
      </div>

      {/* Por dentro da Job Fast */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Por dentro da Job Fast</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <JobCard
            title="Seus"
            subtitle="projetos seguros"
            color="blue"
            buttonText="Ver"
          />
          
          <JobCard
            title="Contrate no"
            subtitle="mesmo dia!"
            description="Encontre profissionais rapidamente!"
            color="orange"
            buttonText="Ver"
          />
        </div>
      </div>
    </div>
  );
}