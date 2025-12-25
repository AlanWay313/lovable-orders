import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  UtensilsCrossed,
  Truck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  X,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  tip: string;
  completed: boolean;
}

interface StoreOnboardingProps {
  companyId: string | null;
  userId: string;
}

export function StoreOnboarding({ companyId, userId }: StoreOnboardingProps) {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [companyId, userId]);

  const checkOnboardingStatus = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      // Check if user has seen onboarding
      const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${userId}`);
      
      // Check store configuration
      const { data: company } = await supabase
        .from('companies')
        .select('name, phone, address, logo_url')
        .eq('id', companyId)
        .single();

      // Check categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Check products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Check drivers count
      const { count: driversCount } = await supabase
        .from('delivery_drivers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      const isStoreConfigured = !!(
        company?.phone &&
        company?.address &&
        company?.logo_url
      );

      const hasMenu = (categoriesCount || 0) > 0 && (productsCount || 0) > 0;
      const hasDrivers = (driversCount || 0) > 0;

      const updatedSteps: OnboardingStep[] = [
        {
          id: 'store',
          title: 'Configurar Loja',
          description: 'Adicione logo, endereço, telefone e horários',
          icon: Store,
          route: '/dashboard/store',
          tip: 'Uma loja bem configurada passa mais confiança para seus clientes!',
          completed: isStoreConfigured,
        },
        {
          id: 'menu',
          title: 'Criar Cardápio',
          description: 'Adicione categorias e produtos',
          icon: UtensilsCrossed,
          route: '/dashboard/menu',
          tip: 'Comece com pelo menos 3 categorias e adicione fotos aos produtos.',
          completed: hasMenu,
        },
        {
          id: 'drivers',
          title: 'Cadastrar Entregadores',
          description: 'Adicione sua equipe de entrega',
          icon: Truck,
          route: '/dashboard/drivers',
          tip: 'Os entregadores receberão notificações automáticas de novos pedidos!',
          completed: hasDrivers,
        },
      ];

      setSteps(updatedSteps);

      // Show welcome modal only on first visit and if not all steps completed
      const allCompleted = updatedSteps.every(s => s.completed);
      if (!hasSeenOnboarding && !allCompleted) {
        setShowWelcome(true);
        localStorage.setItem(`onboarding_seen_${userId}`, 'true');
      }

      // Always show checklist banner if not all steps completed
      setShowChecklist(!allCompleted);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const handleStartStep = (route: string) => {
    setShowWelcome(false);
    navigate(route);
  };

  const getNextStep = () => {
    return steps.find(s => !s.completed);
  };

  if (loading || !showChecklist) {
    return null;
  }

  const nextStep = getNextStep();

  return (
    <>
      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-display">
              Bem-vindo ao DeliveryPro! 🎉
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Sua loja foi criada com sucesso! Agora vamos configurar tudo para você começar a receber pedidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Siga estes 3 passos simples para começar:
            </p>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <Card
                  key={step.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    step.completed
                      ? 'border-primary/30 bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleStartStep(step.route)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.completed
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {nextStep && (
              <Button
                className="w-full gradient-primary"
                onClick={() => handleStartStep(nextStep.route)}
              >
                Começar: {nextStep.title}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowWelcome(false)}
            >
              Fazer isso depois
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/5">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Progress Section */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Configure sua loja</h3>
                <Badge variant="secondary" className="ml-auto lg:ml-2">
                  {completedCount}/{steps.length} concluído
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Steps Pills */}
            <div className="flex flex-wrap gap-2">
              {steps.map((step) => (
                <Button
                  key={step.id}
                  variant={step.completed ? 'default' : 'outline'}
                  size="sm"
                  className={step.completed ? 'bg-primary/80' : ''}
                  onClick={() => navigate(step.route)}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  ) : (
                    <step.icon className="h-4 w-4 mr-1" />
                  )}
                  {step.title}
                </Button>
              ))}
            </div>
          </div>

          {/* Tip Section */}
          {nextStep && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Próximo passo: </span>
                {nextStep.tip}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
