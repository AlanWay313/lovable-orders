import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Crown,
  Check,
  Loader2,
  Zap,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const PLANS = [
  {
    key: 'free',
    name: 'Gratuito',
    price: 0,
    orderLimit: 1000,
    icon: Zap,
    features: [
      'Até 1.000 pedidos/mês',
      'Cardápio digital',
      'Gestão de pedidos',
      'Notificações em tempo real',
    ],
  },
  {
    key: 'basic',
    name: 'Básico',
    price: 29.9,
    orderLimit: 2000,
    icon: Crown,
    features: [
      'Até 2.000 pedidos/mês',
      'Tudo do plano gratuito',
      'Cupons de desconto',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 49.9,
    orderLimit: 5000,
    icon: Crown,
    popular: true,
    features: [
      'Até 5.000 pedidos/mês',
      'Tudo do plano básico',
      'Múltiplos entregadores',
      'Integrações avançadas',
      'API personalizada',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 99.9,
    orderLimit: -1,
    icon: Building2,
    features: [
      'Pedidos ilimitados',
      'Tudo do plano pro',
      'Gerente de conta dedicado',
      'SLA garantido',
      'Customizações sob demanda',
    ],
  },
];

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
      // Load company data
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      setCompany(companyData);

      // Check subscription
      await checkSubscription();
    } catch (error) {
      console.error('Error loading data:', error);
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

      if (response.error) throw new Error(response.error.message);

      const { url } = response.data;
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar assinatura',
        description: error.message,
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
  const orderLimit = subscription?.orderLimit || 1000;

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
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
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
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.key;
            const isUpgrade = PLANS.findIndex(p => p.key === plan.key) > PLANS.findIndex(p => p.key === currentPlan);

            return (
              <Card
                key={plan.key}
                className={`relative ${
                  plan.popular ? 'border-primary shadow-lg' : ''
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
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
                    {plan.orderLimit === -1
                      ? 'Pedidos ilimitados'
                      : `Até ${plan.orderLimit.toLocaleString()} pedidos/mês`}
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
                    className={`w-full ${plan.popular ? 'gradient-primary text-primary-foreground' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
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
