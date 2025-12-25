import { useState, useEffect } from 'react';
import {
  Clock,
  Package,
  CheckCircle,
  ChefHat,
  Truck,
  XCircle,
  Loader2,
  Phone,
  MapPin,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionAlert } from '@/components/SubscriptionAlert';
import { PrintReceipt } from '@/components/orders/PrintReceipt';
import { Database } from '@/integrations/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentMethod = Database['public']['Enums']['payment_method'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: unknown;
  notes: string | null;
}

interface DeliveryAddress {
  id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference: string | null;
}

interface DeliveryDriver {
  id: string;
  driver_name: string | null;
  driver_phone: string | null;
  is_available: boolean;
  driver_status: string | null;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  delivery_driver_id: string | null;
  needs_change?: boolean;
  change_for?: number | null;
  order_items?: OrderItem[];
  customer_addresses?: DeliveryAddress;
  delivery_driver?: DeliveryDriver;
}

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'bg-blue-500' },
  preparing: { label: 'Preparando', icon: ChefHat, color: 'bg-orange-500' },
  ready: { label: 'Pronto', icon: Package, color: 'bg-purple-500' },
  awaiting_driver: { label: 'Aguardando Entregador', icon: Truck, color: 'bg-amber-500' },
  out_for_delivery: { label: 'Em entrega', icon: Truck, color: 'bg-cyan-500' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-red-500' },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card_on_delivery: 'Cartão na entrega',
  online: 'Cartão online',
};

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'awaiting_driver', 'out_for_delivery', 'delivered'];

export default function OrdersManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { status: subscriptionStatus } = useSubscriptionStatus();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Loja');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [availableDrivers, setAvailableDrivers] = useState<DeliveryDriver[]>([]);
  const [assigningDriver, setAssigningDriver] = useState(false);

  useEffect(() => {
    loadCompanyAndOrders();
  }, [user]);

  // Load available drivers when company is set
  useEffect(() => {
    if (companyId) {
      loadAvailableDrivers();
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Order change:', payload);
          if (payload.eventType === 'INSERT') {
            loadOrderDetails(payload.new.id);
            // Play notification sound
            playNotificationSound();
            toast({
              title: 'Novo pedido!',
              description: `Pedido #${payload.new.id.slice(0, 8)} recebido`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? { ...o, ...payload.new } : o
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }
  };

  const loadCompanyAndOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!company) {
        setLoading(false);
        return;
      }

      setCompanyId(company.id);
      setCompanyName(company.name || 'Loja');

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          customer_addresses:delivery_address_id (*)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Erro ao carregar pedidos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('delivery_drivers')
        .select('id, driver_name, driver_phone, is_available, driver_status')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('driver_name');

      if (error) throw error;
      setAvailableDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const assignDriverToOrder = async (orderId: string, driverId: string) => {
    if (!companyId) return;
    
    setAssigningDriver(true);
    try {
      const { data, error } = await supabase.functions.invoke('assign-driver', {
        body: { orderId, driverId, companyId }
      });

      if (error) throw error;

      toast({
        title: 'Entregador atribuído',
        description: data.driverName ? `${data.driverName} foi atribuído ao pedido` : 'Entregador atribuído com sucesso',
      });

      // Reload orders to get updated data
      loadCompanyAndOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir entregador',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigningDriver(false);
    }
  };

  const loadOrderDetails = async (orderId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        customer_addresses:delivery_address_id (*)
      `)
      .eq('id', orderId)
      .single();

    if (!error && data) {
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === data.id);
        if (exists) {
          return prev.map((o) => (o.id === data.id ? data : o));
        }
        return [data, ...prev];
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Pedido alterado para "${statusConfig[newStatus].label}"`,
      });

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'active') {
      return !['delivered', 'cancelled'].includes(order.status);
    }
    if (statusFilter === 'completed') {
      return order.status === 'delivered';
    }
    if (statusFilter === 'cancelled') {
      return order.status === 'cancelled';
    }
    return true;
  });

  const ordersByStatus = {
    pending: filteredOrders.filter((o) => o.status === 'pending'),
    confirmed: filteredOrders.filter((o) => o.status === 'confirmed'),
    preparing: filteredOrders.filter((o) => o.status === 'preparing'),
    ready: filteredOrders.filter((o) => o.status === 'ready'),
    awaiting_driver: filteredOrders.filter((o) => o.status === 'awaiting_driver'),
    out_for_delivery: filteredOrders.filter((o) => o.status === 'out_for_delivery'),
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

  if (!companyId) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Nenhuma loja encontrada</h2>
            <p className="text-muted-foreground text-center mb-4">
              Você precisa cadastrar sua loja antes de gerenciar pedidos
            </p>
            <Button asChild>
              <a href="/dashboard/store">Cadastrar Loja</a>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">Pedidos</h1>
            <p className="text-muted-foreground">
              Gerencie os pedidos da sua loja em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadCompanyAndOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

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

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Bell className="h-4 w-4" />
              Ativos ({orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Entregues ({orders.filter((o) => o.status === 'delivered').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelados ({orders.filter((o) => o.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {/* Kanban-style view for active orders */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {(['pending', 'confirmed', 'preparing', 'ready', 'awaiting_driver', 'out_for_delivery'] as OrderStatus[]).map(
                (status) => (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusConfig[status].color}`} />
                      <h3 className="font-medium text-sm">{statusConfig[status].label}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {ordersByStatus[status]?.length || 0}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {ordersByStatus[status]?.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onClick={() => setSelectedOrder(order)}
                        />
                      ))}
                      {(ordersByStatus[status]?.length || 0) === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                          Nenhum pedido
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <OrdersList
              orders={filteredOrders}
              onViewOrder={setSelectedOrder}
            />
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <OrdersList
              orders={filteredOrders}
              onViewOrder={setSelectedOrder}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display">
                Pedido #{selectedOrder?.id.slice(0, 8)}
              </DialogTitle>
              {selectedOrder && (
                <PrintReceipt order={selectedOrder} companyName={companyName} />
              )}
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusConfig[selectedOrder.status].color}`} />
                  <span className="font-medium">{statusConfig[selectedOrder.status].label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(selectedOrder.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>

              {/* Status Actions */}
              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <div className="flex gap-2">
                  {getNextStatus(selectedOrder.status) && (
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground"
                      onClick={() =>
                        updateOrderStatus(
                          selectedOrder.id,
                          getNextStatus(selectedOrder.status)!
                        )
                      }
                      disabled={updatingStatus}
                    >
                      {updatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Avançar para "{statusConfig[getNextStatus(selectedOrder.status)!].label}"
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    disabled={updatingStatus}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              <Separator />

              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Cliente</h4>
                <p className="font-medium">{selectedOrder.customer_name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">
                    {selectedOrder.customer_phone}
                  </a>
                </div>
                {selectedOrder.customer_email && (
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer_email}</p>
                )}
              </div>

              {/* Address */}
              {selectedOrder.customer_addresses && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço de Entrega
                  </h4>
                  <p className="text-sm">
                    {selectedOrder.customer_addresses.street}, {selectedOrder.customer_addresses.number}
                    {selectedOrder.customer_addresses.complement && `, ${selectedOrder.customer_addresses.complement}`}
                  </p>
                  <p className="text-sm">
                    {selectedOrder.customer_addresses.neighborhood} - {selectedOrder.customer_addresses.city}/{selectedOrder.customer_addresses.state}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CEP: {selectedOrder.customer_addresses.zip_code}
                  </p>
                  {selectedOrder.customer_addresses.reference && (
                    <p className="text-sm text-muted-foreground italic">
                      Ref: {selectedOrder.customer_addresses.reference}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Itens do Pedido</h4>
                {selectedOrder.order_items?.map((item) => {
                  const options = Array.isArray(item.options) ? item.options as { name: string; priceModifier: number }[] : [];
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.quantity}x</span> {item.product_name}
                        {options.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {options.map((o) => o.name).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                        )}
                      </div>
                      <span>R$ {Number(item.total_price).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Observações:</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span>R$ {Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {Number(selectedOrder.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Pagamento</span>
                  <Badge variant="outline">
                    {paymentMethodLabels[selectedOrder.payment_method]}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-muted-foreground">
          #{order.id.slice(0, 8)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(order.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>
      <p className="font-medium text-sm truncate">{order.customer_name}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-muted-foreground">
          {order.order_items?.length || 0} {(order.order_items?.length || 0) === 1 ? 'item' : 'itens'}
        </span>
        <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
      </div>
    </button>
  );
}

function OrdersList({
  orders,
  onViewOrder,
}: {
  orders: Order[];
  onViewOrder: (order: Order) => void;
}) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum pedido encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewOrder(order)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${statusConfig[order.status].color}`} />
                <div>
                  <p className="font-mono text-sm">#{order.id.slice(0, 8)}</p>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
