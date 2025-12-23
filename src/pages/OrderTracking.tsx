import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Phone,
  Loader2,
  ChefHat,
  CircleCheck,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  customer_name: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  created_at: string;
  estimated_delivery_time: string | null;
  notes: string | null;
  company: {
    name: string;
    phone: string | null;
    logo_url: string | null;
    primary_color: string | null;
  };
  items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string; step: number }> = {
  pending: { label: 'Aguardando confirmação', icon: Clock, color: '#eab308', step: 0 },
  confirmed: { label: 'Pedido confirmado', icon: CheckCircle, color: '#3b82f6', step: 1 },
  preparing: { label: 'Em preparação', icon: ChefHat, color: '#f97316', step: 2 },
  ready: { label: 'Pronto para entrega', icon: Package, color: '#a855f7', step: 3 },
  out_for_delivery: { label: 'Saiu para entrega', icon: Truck, color: '#06b6d4', step: 4 },
  delivered: { label: 'Entregue', icon: CircleCheck, color: '#22c55e', step: 5 },
  cancelled: { label: 'Cancelado', icon: XCircle, color: '#ef4444', step: -1 },
};

const statusSteps = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrder();
      subscribeToUpdates();
    }
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          company:companies(name, phone, logo_url, primary_color)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) {
        setError('Pedido não encontrado');
        setLoading(false);
        return;
      }

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      setOrder({
        ...orderData,
        company: orderData.company as Order['company'],
        items: itemsData || [],
      });
    } catch (err: any) {
      console.error('Error loading order:', err);
      setError('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Pedido não encontrado</h2>
            <p className="text-muted-foreground">
              Verifique o link e tente novamente
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = statusConfig[order.status];
  const isCancelled = order.status === 'cancelled';

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ '--primary': order.company.primary_color || '#10B981' } as React.CSSProperties}
    >
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {order.company.logo_url ? (
            <img
              src={order.company.logo_url}
              alt={order.company.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-semibold">{order.company.name}</h1>
            <p className="text-sm text-muted-foreground">
              Pedido #{order.id.slice(0, 8)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status do Pedido</CardTitle>
              <Badge
                style={{
                  backgroundColor: `${currentStatus.color}20`,
                  color: currentStatus.color,
                  borderColor: currentStatus.color,
                }}
                variant="outline"
              >
                {currentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Steps */}
            {!isCancelled && (
              <div className="py-4">
                <div className="relative flex items-center justify-between">
                  {statusSteps.map((step, index) => {
                    const stepConfig = statusConfig[step];
                    const isCompleted = currentStatus.step >= stepConfig.step;
                    const isCurrent = order.status === step;

                    return (
                      <div key={step} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                        >
                          <stepConfig.icon className="h-5 w-5" />
                        </div>
                        <span className={`text-xs mt-2 text-center max-w-[60px] ${
                          isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {stepConfig.label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                  {/* Progress Line */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted -z-0">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${(currentStatus.step / (statusSteps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="py-4 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
                <p className="text-destructive font-medium">Pedido cancelado</p>
              </div>
            )}

            {order.estimated_delivery_time && !isCancelled && order.status !== 'delivered' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 pt-4 border-t">
                <Clock className="h-4 w-4" />
                <span>
                  Previsão de entrega:{' '}
                  {format(new Date(order.estimated_delivery_time), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhes do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <span className="font-medium">{item.quantity}x</span>{' '}
                    {item.product_name}
                  </div>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {order.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Observações:</p>
                  <p className="text-sm mt-1">{order.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        {order.company.phone && (
          <Card>
            <CardContent className="py-4">
              <a
                href={`tel:${order.company.phone}`}
                className="flex items-center gap-3 text-primary hover:underline"
              >
                <Phone className="h-5 w-5" />
                <span>Ligar para {order.company.name}</span>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Order Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Pedido realizado em{' '}
            {format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </main>
    </div>
  );
}
