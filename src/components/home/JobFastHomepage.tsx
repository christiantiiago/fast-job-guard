import { PromoCarousel } from './PromoCarousel';
import { HighlightSection } from './HighlightSection';
import { JobCard } from './JobCard';
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
  Star
} from 'lucide-react';

interface JobFastHomepageProps {
  userRole: 'client' | 'provider';
}

export function JobFastHomepage({ userRole }: JobFastHomepageProps) {
  const providerHighlights = [
    { id: '1', title: 'Vale Gasolina', icon: Gift, color: 'primary' as const, isNew: true },
    { id: '2', title: 'Novidade!', icon: Star, color: 'accent' as const, isNew: true },
    { id: '3', title: 'Repasse semanal', icon: Calendar, color: 'secondary' as const },
    { id: '4', title: 'Evite bloqueios', icon: Shield, color: 'primary' as const }
  ];

  const clientHighlights = [
    { id: '1', title: 'Criar Job', icon: Plus, color: 'primary' as const },
    { id: '2', title: 'Urgente', icon: Clock, color: 'accent' as const, isNew: true },
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
        onItemClick={(item) => console.log('Clicked:', item.title)}
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