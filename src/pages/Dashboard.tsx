import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useReportExport } from '@/hooks/useReportExport';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Truck,
  Clock,
  CheckCircle,
  Package,
  Calendar,
  FileDown,
  FileSpreadsheet,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { SubscriptionAlert } from '@/components/SubscriptionAlert';
import { StoreOnboarding } from '@/components/onboarding/StoreOnboarding';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodFilter = 'today' | '7days' | '30days';

interface DashboardStats {
  ordersPeriod: number;
  ordersPrevious: number;
  revenuePeriod: number;
  revenuePrevious: number;
  averageTicket: number;
  averageTicketPrevious: number;
  pendingOrders: number;
  inDeliveryOrders: number;
  deliveredPeriod: number;
  cancelledPeriod: number;
}

interface ChartData {
  date: string;
  orders: number;
  revenue: number;
}

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

interface RecentOrder {
  id: string;
  created_at: string;
  customer_name: string;
  total: number;
  status: string;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface FullOrderData {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  status: string;
  payment_method: string;
  payment_status: string;
}

const statusColors: Record<string, string> = {
  pending: '#eab308',
  confirmed: '#3b82f6',
  preparing: '#f97316',
  ready: '#a855f7',
  out_for_delivery: '#06b6d4',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const periodLabels: Record<PeriodFilter, string> = {
  today: 'Hoje',
  '7days': '7 dias',
  '30days': '30 dias',
};

const periodCompareLabels: Record<PeriodFilter, string> = {
  today: 'vs ontem',
  '7days': 'vs 7 dias anteriores',
  '30days': 'vs 30 dias anteriores',
};

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { exportToPDF, exportToExcel } = useReportExport();
  const { status: subscriptionStatus } = useSubscriptionStatus();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [allOrdersData, setAllOrdersData] = useState<FullOrderData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    ordersPeriod: 0,
    ordersPrevious: 0,
    revenuePeriod: 0,
    revenuePrevious: 0,
    averageTicket: 0,
    averageTicketPrevious: 0,
    pendingOrders: 0,
    inDeliveryOrders: 0,
    deliveredPeriod: 0,
    cancelledPeriod: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [statusData, setStatusData] = useState<OrderStatusData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user, period]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get company
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!company) {
        setLoading(false);
        return;
      }

      setCompanyId(company.id);
      setCompanyName(company.name);

      const today = new Date();
      
      // Calculate period ranges based on filter
      let periodDays = 1;
      if (period === '7days') periodDays = 7;
      if (period === '30days') periodDays = 30;

      const periodStart = startOfDay(subDays(today, periodDays - 1)).toISOString();
      const periodEnd = endOfDay(today).toISOString();
      const previousStart = startOfDay(subDays(today, periodDays * 2 - 1)).toISOString();
      const previousEnd = endOfDay(subDays(today, periodDays)).toISOString();

      // Get all orders for the company with full data for export
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, created_at, total, subtotal, delivery_fee, status, customer_name, customer_phone, payment_method, payment_status')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (!allOrders) {
        setLoading(false);
        return;
      }

      setAllOrdersData(allOrders as FullOrderData[]);

      // Calculate stats for current period
      const ordersPeriod = allOrders.filter(
        (o) => o.created_at >= periodStart && o.created_at <= periodEnd
      );
      const ordersPrevious = allOrders.filter(
        (o) => o.created_at >= previousStart && o.created_at <= previousEnd
      );

      const revenuePeriod = ordersPeriod
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0);
      const revenuePrevious = ordersPrevious
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0);

      const validOrdersPeriod = ordersPeriod.filter((o) => o.status !== 'cancelled');
      const validOrdersPrevious = ordersPrevious.filter((o) => o.status !== 'cancelled');

      const averageTicket = validOrdersPeriod.length > 0
        ? revenuePeriod / validOrdersPeriod.length
        : 0;
      const averageTicketPrevious = validOrdersPrevious.length > 0
        ? revenuePrevious / validOrdersPrevious.length
        : 0;

      const pendingOrders = allOrders.filter(
        (o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
      ).length;
      const inDeliveryOrders = allOrders.filter((o) => o.status === 'out_for_delivery').length;
      const deliveredPeriod = ordersPeriod.filter((o) => o.status === 'delivered').length;
      const cancelledPeriod = ordersPeriod.filter((o) => o.status === 'cancelled').length;

      setStats({
        ordersPeriod: ordersPeriod.length,
        ordersPrevious: ordersPrevious.length,
        revenuePeriod,
        revenuePrevious,
        averageTicket,
        averageTicketPrevious,
        pendingOrders,
        inDeliveryOrders,
        deliveredPeriod,
        cancelledPeriod,
      });

      // Calculate chart data based on period
      const chartDays: ChartData[] = [];
      for (let i = periodDays - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = endOfDay(date).toISOString();

        const dayOrders = allOrders.filter(
          (o) => o.created_at >= dayStart && o.created_at <= dayEnd && o.status !== 'cancelled'
        );

        chartDays.push({
          date: periodDays <= 7 
            ? format(date, 'EEE', { locale: ptBR })
            : format(date, 'dd/MM', { locale: ptBR }),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        });
      }
      setChartData(chartDays);

      // Calculate status distribution
      const statusCounts: Record<string, number> = {};
      allOrders.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });

      const statusChartData = Object.entries(statusCounts)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: statusLabels[status] || status,
          value: count,
          color: statusColors[status] || '#6b7280',
        }));
      setStatusData(statusChartData);

      // Recent orders
      setRecentOrders(allOrders.slice(0, 5));

      // Top products - fetch order items for the period
      const orderIds = ordersPeriod.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_name, quantity, total_price')
          .in('order_id', orderIds);

        if (orderItems) {
          const productMap = new Map<string, { quantity: number; revenue: number }>();
          orderItems.forEach(item => {
            const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
            productMap.set(item.product_name, {
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + item.total_price,
            });
          });
          
          const sortedProducts = Array.from(productMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
          
          setTopProducts(sortedProducts);
        }
      } else {
        setTopProducts([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      // Calculate period for report
      const today = new Date();
      let periodDays = 1;
      if (period === '7days') periodDays = 7;
      if (period === '30days') periodDays = 30;

      const periodStart = startOfDay(subDays(today, periodDays - 1)).toISOString();
      const periodEnd = endOfDay(today).toISOString();

      // Filter orders for current period
      const ordersForExport = allOrdersData.filter(
        (o) => o.created_at >= periodStart && o.created_at <= periodEnd
      );

      const validOrders = ordersForExport.filter((o) => o.status !== 'cancelled');
      const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);

      const reportData = {
        orders: ordersForExport,
        period: periodLabels[period],
        companyName,
        stats: {
          totalOrders: ordersForExport.length,
          totalRevenue,
          averageTicket: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
          deliveredOrders: ordersForExport.filter((o) => o.status === 'delivered').length,
          cancelledOrders: ordersForExport.filter((o) => o.status === 'cancelled').length,
        },
      };

      if (type === 'pdf') {
        exportToPDF(reportData);
      } else {
        exportToExcel(reportData);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  const calculateChange = (current: number, previous: number): { value: string; trend: 'up' | 'down' } => {
    if (previous === 0) {
      return { value: current > 0 ? '+100%' : '0%', trend: current >= 0 ? 'up' : 'down' };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`,
      trend: change >= 0 ? 'up' : 'down',
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  const ordersChange = calculateChange(stats.ordersPeriod, stats.ordersPrevious);
  const revenueChange = calculateChange(stats.revenuePeriod, stats.revenuePrevious);
  const ticketChange = calculateChange(stats.averageTicket, stats.averageTicketPrevious);

  const statsCards = [
    {
      title: `Pedidos ${periodLabels[period]}`,
      value: stats.ordersPeriod.toString(),
      change: ordersChange.value,
      trend: ordersChange.trend,
      icon: ShoppingBag,
    },
    {
      title: `Faturamento ${periodLabels[period]}`,
      value: formatCurrency(stats.revenuePeriod),
      change: revenueChange.value,
      trend: revenueChange.trend,
      icon: DollarSign,
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(stats.averageTicket),
      change: ticketChange.value,
      trend: ticketChange.trend,
      icon: TrendingUp,
    },
    {
      title: 'Em Preparo/Entrega',
      value: (stats.pendingOrders + stats.inDeliveryOrders).toString(),
      subValue: `${stats.pendingOrders} preparo · ${stats.inDeliveryOrders} entrega`,
      icon: Clock,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui está um resumo do seu período
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border border-border p-1">
              {(['today', '7days', '30days'] as PeriodFilter[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={period === p ? 'gradient-primary text-primary-foreground' : ''}
                >
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
            
            {companyId && (
              <div className="flex gap-2 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting || allOrdersData.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('excel')}
                  disabled={exporting || allOrdersData.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <PushNotificationButton
                  companyId={companyId}
                  userId={user?.id}
                  userType="store_owner"
                />
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Checklist */}
        {user && (
          <StoreOnboarding companyId={companyId} userId={user.id} />
        )}

        {/* Subscription Alert */}
        {subscriptionStatus && (subscriptionStatus.isNearLimit || subscriptionStatus.isAtLimit) && (
          <SubscriptionAlert
            plan={subscriptionStatus.plan}
            orderLimit={subscriptionStatus.orderLimit}
            monthlyOrderCount={subscriptionStatus.monthlyOrderCount}
            displayName={subscriptionStatus.displayName}
            isNearLimit={subscriptionStatus.isNearLimit}
            isAtLimit={subscriptionStatus.isAtLimit}
            usagePercentage={subscriptionStatus.usagePercentage}
          />
        )}

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
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
                {stat.change ? (
                  <div className="flex items-center text-xs mt-1">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground ml-1">{periodCompareLabels[period]}</span>
                  </div>
                ) : stat.subValue ? (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        {companyId && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Faturamento - {periodLabels[period]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Orders Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Pedidos - {periodLabels[period]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value, 'Pedidos']}
                      />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            {statusData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 min-w-[140px]">
                      {statusData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-medium ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Products */}
            {topProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Produtos Mais Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} vendidos</p>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(product.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Resumo de Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Entregues</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{stats.deliveredPeriod}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600">
                      <Package className="h-5 w-5" />
                      <span className="font-medium">Cancelados</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{stats.cancelledPeriod}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Em Preparo</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{stats.pendingOrders}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Truck className="h-5 w-5" />
                      <span className="font-medium">Em Entrega</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{stats.inDeliveryOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick actions for new stores */}
        {hasRole('store_owner') && !companyId && (
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

        {/* Recent orders */}
        {recentOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Pedidos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          #{order.id.slice(0, 8)} · {format(new Date(order.created_at), "dd/MM 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        style={{
                          backgroundColor: `${statusColors[order.status]}20`,
                          color: statusColors[order.status],
                          borderColor: statusColors[order.status],
                        }}
                        variant="outline"
                      >
                        {statusLabels[order.status]}
                      </Badge>
                      <span className="font-medium">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state for orders */}
        {companyId && recentOrders.length === 0 && (
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
        )}
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
