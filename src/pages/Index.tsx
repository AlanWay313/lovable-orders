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
  Star,
  Clock,
  Users,
  Zap,
  ChevronRight,
  Play,
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
    description: 'Design responsivo e intuitivo que funciona perfeitamente em qualquer dispositivo',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Truck,
    title: 'Gestão de Entregas',
    description: 'Controle completo de entregadores, rotas e status em tempo real',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos Online',
    description: 'Aceite cartões, PIX e outros métodos com checkout seguro integrado',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Acompanhe vendas, produtos mais pedidos e métricas em tempo real',
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    icon: Zap,
    title: 'Pedidos em Tempo Real',
    description: 'Notificações instantâneas e painel de pedidos ao vivo',
    color: 'bg-yellow-500/10 text-yellow-600',
  },
  {
    icon: Shield,
    title: 'Seguro & Confiável',
    description: 'Infraestrutura robusta com proteção de dados e alta disponibilidade',
    color: 'bg-red-500/10 text-red-600',
  },
];

const pricingPlans = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    description: 'Ideal para começar',
    features: [
      'Até 1.000 pedidos/mês',
      'Cardápio digital completo',
      'Gestão de pedidos',
      'Notificações em tempo real',
    ],
    cta: 'Começar grátis',
    variant: 'outline' as const,
  },
  {
    name: 'Básico',
    price: 'R$ 29',
    period: ',90/mês',
    description: 'Para pequenos negócios',
    features: [
      'Até 2.000 pedidos/mês',
      'Cupons de desconto',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    cta: 'Assinar agora',
    variant: 'outline' as const,
  },
  {
    name: 'Pro',
    price: 'R$ 49',
    period: ',90/mês',
    description: 'Mais popular',
    features: [
      'Até 5.000 pedidos/mês',
      'Múltiplos entregadores',
      'Integrações avançadas',
      'API personalizada',
      'Dashboard premium',
    ],
    cta: 'Assinar Pro',
    popular: true,
    variant: 'default' as const,
  },
  {
    name: 'Enterprise',
    price: 'R$ 99',
    period: ',90/mês',
    description: 'Para grandes operações',
    features: [
      'Pedidos ilimitados',
      'Gerente de conta dedicado',
      'SLA garantido',
      'Customizações sob demanda',
      'Onboarding personalizado',
    ],
    cta: 'Falar com vendas',
    variant: 'outline' as const,
  },
];

const stats = [
  { value: '10k+', label: 'Pedidos/mês' },
  { value: '500+', label: 'Restaurantes' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9', label: 'Avaliação', icon: Star },
];

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Pizzaria do Zé',
    content: 'Aumentamos em 40% nossos pedidos depois de adotar o sistema. A gestão ficou muito mais simples!',
    avatar: null,
  },
  {
    name: 'Ana Paula',
    role: 'Doces da Ana',
    content: 'Interface incrível e suporte excelente. Meus clientes adoram a facilidade de pedir online.',
    avatar: null,
  },
  {
    name: 'Roberto Costa',
    role: 'Hamburgueria Premium',
    content: 'O sistema de entregas é fantástico. Consigo acompanhar tudo em tempo real.',
    avatar: null,
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
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">MenuPro</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#restaurants" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Restaurantes
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="gradient-primary text-primary-foreground shadow-glow">
                <Link to={hasRole('delivery_driver') && !hasRole('store_owner') && !hasRole('super_admin') ? '/driver' : '/dashboard'}>
                  {hasRole('delivery_driver') && !hasRole('store_owner') && !hasRole('super_admin') ? 'Painel Entregador' : 'Dashboard'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="gradient-primary text-primary-foreground shadow-sm hover:shadow-glow transition-shadow">
                  <Link to="/auth">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text */}
            <div className="animate-slide-up">
              <Badge variant="secondary" className="mb-6 px-4 py-2 bg-accent text-accent-foreground border-0">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Novo: Sistema de entregas integrado
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.1] mb-6">
                Seu cardápio digital
                <span className="text-gradient block mt-2">pronto para vender</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Crie seu cardápio online em minutos, receba pedidos e gerencie entregas. 
                A plataforma completa para impulsionar seu negócio de alimentação.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" asChild className="gradient-primary text-primary-foreground shadow-glow h-12 px-8 text-base">
                  <Link to="/auth">
                    Começar grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                  <a href="#restaurants">
                    <Play className="mr-2 h-4 w-4" />
                    Ver restaurantes
                  </a>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center sm:text-left">
                    <div className="flex items-center gap-1 font-display text-2xl font-bold text-foreground">
                      {stat.value}
                      {stat.icon && <stat.icon className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative animate-fade-in hidden lg:block">
              <div className="relative">
                {/* Phone mockup */}
                <div className="relative mx-auto w-72 h-[580px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-6 bg-foreground rounded-full z-10" />
                  <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                    <div className="p-4 space-y-4">
                      <div className="h-12 bg-muted rounded-xl" />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-16 bg-primary/10 rounded-xl" />
                        <div className="h-16 bg-muted rounded-xl" />
                        <div className="h-16 bg-muted rounded-xl" />
                      </div>
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                            <div className="w-16 h-16 bg-muted rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted rounded w-1/2" />
                              <div className="h-4 bg-primary/20 rounded w-1/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -right-4 top-20 bg-card p-4 rounded-2xl shadow-lg border border-border animate-bounce-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                      <Check className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Novo pedido!</div>
                      <div className="text-xs text-muted-foreground">R$ 89,90</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-8 bottom-32 bg-card p-4 rounded-2xl shadow-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Entrega em andamento</div>
                      <div className="text-xs text-muted-foreground">15 min restantes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurants Section */}
      {(loadingCompanies || companies.length > 0) && (
        <section id="restaurants" className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Restaurantes parceiros</Badge>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Peça agora nos melhores
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Explore restaurantes incríveis e faça seu pedido com facilidade
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loadingCompanies ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-card border border-border">
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
                companies.map((company, index) => (
                  <Link
                    key={company.id}
                    to={`/menu/${company.slug}`}
                    className="group p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex gap-4">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                          <Store className="h-7 w-7 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold font-display truncate group-hover:text-primary transition-colors">
                            {company.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={company.is_open 
                              ? 'badge-open flex-shrink-0' 
                              : 'badge-closed flex-shrink-0'
                            }
                          >
                            {company.is_open ? 'Aberto' : 'Fechado'}
                          </Badge>
                        </div>
                        {company.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {company.description}
                          </p>
                        )}
                        {company.city && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {company.city}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>30-45 min</span>
                      </div>
                      <span className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Ver cardápio
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Recursos</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Tudo para gerenciar seu negócio
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Uma plataforma completa com todas as ferramentas que você precisa
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="p-6 rounded-2xl bg-card border border-border animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Preços</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Planos para todos os tamanhos
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Escolha o plano ideal e comece a vender hoje mesmo
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl border animate-fade-in ${
                  plan.popular
                    ? 'border-primary bg-card shadow-lg shadow-primary/10 scale-[1.02]'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground border-0 shadow-glow">
                      Mais popular
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-display font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-display font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? 'gradient-primary text-primary-foreground shadow-glow' : ''}`}
                  variant={plan.variant}
                  asChild
                >
                  <Link to="/auth">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container relative text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
            Junte-se a centenas de restaurantes que já usam o MenuPro para aumentar suas vendas
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="h-12 px-8">
              <Link to="/auth">
                Criar conta grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 bg-transparent border-white/30 text-white hover:bg-white/10">
              <a href="#restaurants">Ver restaurantes</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <Store className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">MenuPro</span>
            </div>

            <nav className="flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </a>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Entrar
              </Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MenuPro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
