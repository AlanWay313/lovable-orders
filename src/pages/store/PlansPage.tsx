import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Crown,
  Check,
  Loader2,
  Zap,
  Building2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Plan {
  key: string;
  name: string;
  description: string | null;
  price: number;
  order_limit: number;
  stripe_price_id: string | null;
  features: string[];
  is_popular?: boolean;
}

interface SubscriptionData {
  subscribed: boolean;
  plan: string;
  orderLimit: number;
  displayName: string;
  subscriptionEnd?: string;
}

export default function PlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      toast({
        title: 'Assinatura ativada!',
        description: 'Seu plano foi ativado com sucesso',
      });
      checkSubscription();
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load plans from database
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (plansError) throw plansError;

      setPlans(plansData?.map(p => ({
        key: p.key,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        order_limit: p.order_limit,
        stripe_price_id: p.stripe_price_id,
        features: Array.isArray(p.features) 
          ? (p.features as unknown as string[]).map(f => String(f))
          : [],
        is_popular: p.key === 'pro',
      })) || []);

      // Load company data
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      setCompany(companyData);

      // Check subscription
      await checkSubscription();
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const response = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      setSubscription(response.data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSubscribe = async (planKey: string) => {
    if (planKey === 'free') return;

    setSubscribing(planKey);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para assinar',
          variant: 'destructive',
        });
        return;
      }

      const response = await supabase.functions.invoke('create-subscription', {
        body: { planKey },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Subscription error:', response.error);
        throw new Error(response.error.message || 'Erro ao processar assinatura');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const { url } = response.data;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: 'Erro ao iniciar assinatura',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const response = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { url } = response.data;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getIconForPlan = (key: string) => {
    switch (key) {
      case 'enterprise':
        return Building2;
      case 'pro':
      case 'basic':
        return Crown;
      default:
        return Zap;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const orderCount = company?.monthly_order_count || 0;
  const currentPlanData = plans.find(p => p.key === currentPlan);
  const orderLimit = currentPlanData?.order_limit || subscription?.orderLimit || 1000;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-display">Planos e Preços</h1>
          <p className="text-muted-foreground mt-2">
            Escolha o plano ideal para o seu negócio
          </p>
        </div>

        {/* Current Usage */}
        {company && (
          <Card className={`border-primary/20 ${
            orderLimit !== -1 && (orderCount / orderLimit) >= 1 
              ? 'border-destructive/50 bg-destructive/5' 
              : orderLimit !== -1 && (orderCount / orderLimit) >= 0.8 
                ? 'border-warning/50 bg-warning/5'
                : 'bg-primary/5'
          }`}>
            <CardContent className="py-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Uso atual do mês</p>
                  <p className="text-2xl font-bold">
                    {orderCount.toLocaleString()} / {orderLimit === -1 ? '∞' : orderLimit.toLocaleString()} pedidos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={subscription?.subscribed ? 'default' : 'secondary'}>
                    {subscription?.displayName || 'Plano Gratuito'}
                  </Badge>
                  {subscription?.subscribed && (
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Gerenciar
                    </Button>
                  )}
                </div>
              </div>
              
              {orderLimit !== -1 && (
                <>
                  <Progress
                    value={Math.min((orderCount / orderLimit) * 100, 100)}
                    className={`h-2 ${
                      (orderCount / orderLimit) >= 1 
                        ? '[&>div]:bg-destructive' 
                        : (orderCount / orderLimit) >= 0.8 
                          ? '[&>div]:bg-warning'
                          : ''
                    }`}
                  />
                  
                  {(orderCount / orderLimit) >= 1 && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Limite atingido! Sua loja não pode receber novos pedidos.</span>
                    </div>
                  )}
                  
                  {(orderCount / orderLimit) >= 0.8 && (orderCount / orderLimit) < 1 && (
                    <div className="flex items-center gap-2 text-warning text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Você está próximo do limite mensal. Considere fazer upgrade.</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const Icon = getIconForPlan(plan.key);
            const isCurrentPlan = currentPlan === plan.key;
            const isUpgrade = plans.findIndex(p => p.key === plan.key) > plans.findIndex(p => p.key === currentPlan);

            return (
              <Card
                key={plan.key}
                className={`relative ${
                  plan.is_popular ? 'border-primary shadow-lg' : ''
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.is_popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mais Popular
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge variant="secondary" className="absolute -top-3 right-4">
                    Seu Plano
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-display">{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.order_limit === -1
                      ? 'Pedidos ilimitados'
                      : `Até ${plan.order_limit.toLocaleString()} pedidos/mês`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                    </span>
                    {plan.price > 0 && <span className="text-muted-foreground">/mês</span>}
                  </div>
                  <ul className="space-y-2 text-sm text-left mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.is_popular ? 'gradient-primary text-primary-foreground' : ''}`}
                    variant={plan.is_popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || plan.key === 'free' || subscribing !== null}
                    onClick={() => handleSubscribe(plan.key)}
                  >
                    {subscribing === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isCurrentPlan
                      ? 'Plano Atual'
                      : plan.key === 'free'
                      ? 'Gratuito'
                      : isUpgrade
                      ? 'Fazer Upgrade'
                      : 'Selecionar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Como funciona a contagem de pedidos?</h4>
              <p className="text-sm text-muted-foreground">
                Cada pedido confirmado conta para o limite mensal. A contagem reinicia no primeiro dia de cada mês.
              </p>
            </div>
            <div>
              <h4 className="font-medium">O que acontece se eu ultrapassar o limite?</h4>
              <p className="text-sm text-muted-foreground">
                Você receberá um aviso para fazer upgrade do plano. Sua loja continuará funcionando normalmente.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Posso cancelar a qualquer momento?</h4>
              <p className="text-sm text-muted-foreground">
                Sim, você pode cancelar sua assinatura a qualquer momento. O acesso continua até o fim do período pago.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
