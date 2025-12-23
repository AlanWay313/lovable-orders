import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  {
    title: 'Pedidos Hoje',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: ShoppingBag,
  },
  {
    title: 'Faturamento',
    value: 'R$ 2.450',
    change: '+8%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    title: 'Clientes Novos',
    value: '12',
    change: '+23%',
    trend: 'up',
    icon: Users,
  },
  {
    title: 'Ticket Médio',
    value: 'R$ 102',
    change: '-3%',
    trend: 'down',
    icon: TrendingUp,
  },
];

export default function Dashboard() {
  const { user, hasRole } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome section */}
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está um resumo do seu dia
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{stat.value}</div>
                <div className="flex items-center text-xs mt-1">
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3 text-success mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive mr-1" />
                  )}
                  <span
                    className={
                      stat.trend === 'up' ? 'text-success' : 'text-destructive'
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground ml-1">vs ontem</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions / empty state */}
        {hasRole('store_owner') && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <QuickActionCard
                  title="Configure sua loja"
                  description="Adicione logo, cores e informações de contato"
                  href="/dashboard/store"
                />
                <QuickActionCard
                  title="Crie seu cardápio"
                  description="Adicione categorias e produtos"
                  href="/dashboard/menu"
                />
                <QuickActionCard
                  title="Cadastre entregadores"
                  description="Adicione motoboys para suas entregas"
                  href="/dashboard/drivers"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent orders placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido recente</p>
              <p className="text-sm">Os pedidos aparecerão aqui</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function QuickActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-colors group"
    >
      <h3 className="font-medium group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </a>
  );
}