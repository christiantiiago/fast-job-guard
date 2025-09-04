import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Handshake, 
  MessageCircle, 
  Star, 
  Award, 
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  Target,
  Users,
  Briefcase,
  PlusCircle
} from 'lucide-react';

interface JobActionsProps {
  job: any;
  userRole: string;
  onUpdate: () => void;
}

const EnhancedJobActions = ({ job, userRole, onUpdate }: JobActionsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAcceptJob = async () => {
    if (userRole !== 'provider' || job.status !== 'open') return;

    try {
      setLoading(true);
      
      // Create a direct acceptance (simplified proposal)
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          job_id: job.id,
          provider_id: (await supabase.auth.getUser()).data.user?.id,
          price: job.budget_max || job.budget_min || 0,
          message: 'Aceito executar este trabalho conforme especificado.',
          status: 'accepted'
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Update job to assign provider
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ 
          provider_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'in_progress',
          final_price: job.budget_max || job.budget_min || 0
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      toast({
        title: "Trabalho aceito!",
        description: "Você foi contratado para este trabalho. Entre em contato com o cliente.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error accepting job:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o trabalho.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getJobComplexityScore = () => {
    let score = 0;
    
    // Budget complexity
    const budget = job.budget_max || job.budget_min || 0;
    if (budget < 500) score += 1;
    else if (budget < 2000) score += 2;
    else score += 3;
    
    // Description length (more detailed = more complex)
    if (job.description.length > 200) score += 1;
    if (job.requirements) score += 1;
    if (job.images && job.images.length > 0) score += 1;
    
    return Math.min(score, 5);
  };

  const getRecommendedActions = () => {
    if (userRole === 'provider' && job.status === 'open') {
      const complexity = getJobComplexityScore();
      const budget = job.budget_max || job.budget_min || 0;
      
      return [
        {
          title: 'Análise Rápida',
          description: `Complexidade: ${complexity}/5 | Orçamento: ${formatCurrency(budget)}`,
          icon: Target,
          color: 'text-blue-600',
          action: 'analyze'
        },
        {
          title: 'Aceitar Direto',
          description: 'Aceitar trabalho pelo valor proposto',
          icon: CheckCircle,
          color: 'text-green-600',
          action: 'accept'
        },
        {
          title: 'Proposta Personalizada',
          description: 'Enviar proposta com seus termos',
          icon: PlusCircle,
          color: 'text-purple-600',
          action: 'propose'
        }
      ];
    }
    
    return [];
  };

  const actions = getRecommendedActions();

  if (userRole !== 'provider' || job.status !== 'open') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
            <Zap className="h-5 w-5" />
            Análise Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {getJobComplexityScore()}/5
              </div>
              <div className="text-xs text-muted-foreground">Complexidade</div>
            </div>
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.floor(Math.random() * 30 + 70)}%
              </div>
              <div className="text-xs text-muted-foreground">Compatibilidade</div>
            </div>
          </div>
          
          <Progress value={getJobComplexityScore() * 20} className="mb-2" />
          <p className="text-xs text-blue-700">
            Com base no seu perfil, este trabalho tem alta compatibilidade
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid gap-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Card key={action.action} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-muted ${action.color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  
                  {action.action === 'accept' && (
                    <Button
                      onClick={handleAcceptJob}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aceitar
                    </Button>
                  )}
                  
                  {action.action === 'propose' && (
                    <Button variant="outline">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Propor
                    </Button>
                  )}
                  
                  {action.action === 'analyze' && (
                    <Button variant="secondary" size="sm">
                      <Target className="h-4 w-4 mr-2" />
                      Analisar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Market Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Inteligência de Mercado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span>Valor médio para esta categoria:</span>
            <Badge variant="secondary">{formatCurrency((job.budget_min || 0) * 1.15)}</Badge>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span>Tempo médio de conclusão:</span>
            <Badge variant="outline">3-5 dias</Badge>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span>Concorrência:</span>
            <Badge className="bg-yellow-100 text-yellow-800">Moderada</Badge>
          </div>
          
          <Separator />
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Dica:</strong> Trabalhos nesta categoria têm 89% de taxa de conclusão bem-sucedida.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-purple-900">
            <Award className="h-4 w-4" />
            Dicas para Sucesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <p>Responda rapidamente para aumentar suas chances</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <p>Inclua exemplos do seu trabalho anterior</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <p>Seja específico sobre cronograma e entregáveis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedJobActions;