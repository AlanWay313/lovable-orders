import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Smartphone,
  Truck,
  CreditCard,
  BarChart3,
  Shield,
  ArrowRight,
  Check,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  is_open: boolean;
}

const features = [
  {
    icon: Smartphone,
    title: 'Cardápio Digital',
    description: 'Cardápio online responsivo que funciona em qualquer dispositivo',
  },
  {
    icon: Store,
    title: 'Multi-Empresa',
    description: 'Gerencie múltiplas lojas de diferentes segmentos',
  },
  {
    icon: Truck,
    title: 'Sistema de Entregas',
    description: 'Gestão completa de motoboys e rotas de entrega',
  },
  {
    icon: CreditCard,
    title: 'Pagamento Integrado',
    description: 'Aceite pagamentos online com Stripe',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Acompanhe vendas e métricas em tempo real',
  },
  {
    icon: Shield,
    title: 'Seguro & Confiável',
    description: 'Dados protegidos com as melhores práticas de segurança',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'R$ 79',
    description: 'Para pequenos negócios',
    features: ['1 loja', 'Cardápio ilimitado', 'Pedidos ilimitados', 'Suporte por email'],
  },
  {
    name: 'Pro',
    price: 'R$ 149',
    description: 'Para negócios em crescimento',
    features: [
      'Até 3 lojas',
      'Cardápio ilimitado',
      'Pedidos ilimitados',
      'Sistema de delivery',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    description: 'Para grandes operações',
    features: [
      'Lojas ilimitadas',
      'Tudo do Pro',
      'API personalizada',
      'Integração ERP',
      'Gerente de conta dedicado',
    ],
  },
];

export default function Index() {
  const { user, hasRole } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, description, logo_url, city, is_open')
        .eq('status', 'approved')
        .limit(6);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">MenuPro</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild>
                <Link to={hasRole('delivery_driver') && !hasRole('store_owner') && !hasRole('super_admin') ? '/driver' : '/dashboard'}>
                  {hasRole('delivery_driver') && !hasRole('store_owner') && !hasRole('super_admin') ? 'Área do Entregador' : 'Dashboard'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="gradient-primary text-primary-foreground">
                  <Link to="/auth">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
        <div className="container">
          <div className="mx-auto max-w-3xl text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Novo: Sistema de entregas integrado
            </div>
            <h1 className="text-4xl font-bold tracking-tight font-display sm:text-6xl text-foreground">
              Seu cardápio digital
              <span className="text-gradient block">pronto para vender</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Crie seu cardápio online, receba pedidos e gerencie entregas. 
              Tudo em uma plataforma simples e poderosa.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="gradient-primary text-primary-foreground shadow-glow">
                <Link to="/auth">
                  Começar grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Ver recursos</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Companies Section */}
      {(loadingCompanies || companies.length > 0) && (
        <section id="restaurants" className="py-24 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold font-display sm:text-4xl">
                Peça agora
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                Explore os restaurantes parceiros e faça seu pedido
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loadingCompanies ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-card border border-border">
                    <div className="flex gap-4">
                      <Skeleton className="w-16 h-16 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                companies.map((company) => (
                  <Link
                    key={company.id}
                    to={`/menu/${company.slug}`}
                    className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                          <Store className="h-8 w-8 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold font-display truncate group-hover:text-primary transition-colors">
                            {company.name}
                          </h3>
                          <Badge
                            variant={company.is_open ? 'default' : 'secondary'}
                            className={company.is_open ? 'bg-success text-success-foreground text-xs' : 'text-xs'}
                          >
                            {company.is_open ? 'Aberto' : 'Fechado'}
                          </Badge>
                        </div>
                        {company.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {company.description}
                          </p>
                        )}
                        {company.city && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <MapPin className="h-3 w-3" />
                            {company.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Tudo que você precisa
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa para gerenciar seu negócio de alimentação
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold font-display mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Planos para todos os tamanhos
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border ${
                  plan.popular
                    ? 'border-primary bg-card shadow-lg shadow-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-sm font-medium gradient-primary text-primary-foreground">
                      Mais popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold font-display">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold font-display">{plan.price}</span>
                    {plan.price !== 'Sob consulta' && (
                      <span className="text-muted-foreground">/mês</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.popular ? 'gradient-primary text-primary-foreground' : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                  asChild
                >
                  <Link to="/auth">Começar agora</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-hero text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold font-display sm:text-4xl mb-6">
            Pronto para começar?
          </h2>
          <p className="text-white/90 max-w-2xl mx-auto mb-10">
            Junte-se a centenas de empresas que já usam o MenuPro para gerenciar seus pedidos
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Store className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">MenuPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 MenuPro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}