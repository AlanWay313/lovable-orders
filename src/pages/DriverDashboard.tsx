import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Package,
  Navigation,
  Phone,
  Clock,
  CheckCircle,
  Loader2,
  Power,
  PowerOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  notes: string | null;
  needs_change: boolean | null;
  change_for: number | null;
  delivery_address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement: string | null;
    reference: string | null;
    zip_code: string;
  } | null;
  company: {
    name: string;
    address: string | null;
    phone: string | null;
    city: string | null;
  };
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  
  const { startTracking, stopTracking } = useDriverLocation({ 
    enabled: trackingEnabled,
    updateInterval: 15000 
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadDriverData();
  }, [user, navigate]);

  const loadDriverData = async () => {
    if (!user) return;

    try {
      // Check if user is a driver
      const { data: driverData, error: driverError } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (driverError) throw driverError;
      if (!driverData) {
        toast.error('Você não está cadastrado como entregador');
        navigate('/dashboard');
        return;
      }

      setDriver(driverData);

      // Load assigned orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_address:customer_addresses(street, number, neighborhood, city, state, complement, reference, zip_code),
          company:companies(name, address, phone, city)
        `)
        .eq('delivery_driver_id', driverData.id)
        .in('status', ['ready', 'out_for_delivery'])
        .order('created_at', { ascending: true }); // Ordenar por mais antigo primeiro (FIFO)

      if (ordersError) throw ordersError;

      setOrders(ordersData?.map(order => ({
        ...order,
        delivery_address: order.delivery_address as Order['delivery_address'],
        company: order.company as Order['company'],
      })) || []);

    } catch (error) {
      console.error('Error loading driver data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    if (!driver) return;

    const newStatus = !driver.is_available;
    const { error } = await supabase
      .from('delivery_drivers')
      .update({ is_available: newStatus })
      .eq('id', driver.id);

    if (error) {
      toast.error('Erro ao atualizar disponibilidade');
      return;
    }

    setDriver({ ...driver, is_available: newStatus });
    toast.success(newStatus ? 'Você está disponível para entregas' : 'Você está indisponível');
  };

  const handleToggleTracking = (enabled: boolean) => {
    setTrackingEnabled(enabled);
    if (enabled) {
      startTracking();
      toast.success('Rastreamento ativado');
    } else {
      stopTracking();
      toast.info('Rastreamento desativado');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'ready' | 'out_for_delivery' | 'delivered') => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao atualizar pedido');
      return;
    }

    toast.success(newStatus === 'delivered' ? 'Entrega confirmada!' : 'Status atualizado');
    loadDriverData();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg">Painel do Entregador</h1>
              <p className="text-sm text-muted-foreground">{driver?.driver_name}</p>
            </div>
            <Badge variant={driver?.is_available ? 'default' : 'secondary'}>
              {driver?.is_available ? 'Disponível' : 'Indisponível'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Controls */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {driver?.is_available ? (
                  <Power className="h-5 w-5 text-green-500" />
                ) : (
                  <PowerOff className="h-5 w-5 text-muted-foreground" />
                )}
                <Label>Disponível para entregas</Label>
              </div>
              <Switch
                checked={driver?.is_available}
                onCheckedChange={toggleAvailability}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className={`h-5 w-5 ${trackingEnabled ? 'text-blue-500' : 'text-muted-foreground'}`} />
                <Label>Compartilhar localização</Label>
              </div>
              <Switch
                checked={trackingEnabled}
                onCheckedChange={handleToggleTracking}
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entregas Pendentes ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma entrega pendente</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order, index) => (
              <Card key={order.id} className={index === 0 ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Badge variant="destructive" className="text-xs">Próxima</Badge>
                      )}
                      <CardTitle className="text-base">{order.company.name}</CardTitle>
                    </div>
                    <Badge variant={order.status === 'out_for_delivery' ? 'default' : 'secondary'}>
                      {order.status === 'out_for_delivery' ? 'Em entrega' : 'Pronto'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(order.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{order.customer_name}</span>
                    </div>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{order.customer_phone}</span>
                    </a>
                  </div>

                  {/* Delivery Address */}
                  {order.delivery_address && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="text-sm flex-1">
                          <p className="font-medium text-base">
                            {order.delivery_address.street}, {order.delivery_address.number}
                          </p>
                          <p className="text-muted-foreground">
                            {order.delivery_address.neighborhood}
                          </p>
                          <p className="text-muted-foreground">
                            {order.delivery_address.city} - {order.delivery_address.state}
                          </p>
                          {order.delivery_address.complement && (
                            <p className="text-muted-foreground mt-1">
                              <span className="font-medium">Complemento:</span> {order.delivery_address.complement}
                            </p>
                          )}
                          {order.delivery_address.reference && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Referência:</span> {order.delivery_address.reference}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs mt-1">
                            CEP: {order.delivery_address.zip_code}
                          </p>
                        </div>
                      </div>
                      
                      {/* Open in Maps Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const address = `${order.delivery_address!.street}, ${order.delivery_address!.number}, ${order.delivery_address!.neighborhood}, ${order.delivery_address!.city}, ${order.delivery_address!.state}`;
                          const encodedAddress = encodeURIComponent(address);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Abrir no Google Maps
                      </Button>
                    </div>
                  )}

                  {/* Payment Info */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span>Forma de pagamento:</span>
                      <Badge variant="outline">
                        {order.payment_method === 'cash' && 'Dinheiro'}
                        {order.payment_method === 'card_on_delivery' && 'Cartão na entrega'}
                        {order.payment_method === 'pix' && 'PIX'}
                        {order.payment_method === 'online' && 'Pago online'}
                      </Badge>
                    </div>
                    {order.needs_change && order.change_for && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm">
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">
                          Troco para: {formatCurrency(order.change_for)}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa de entrega</span>
                        <span>{formatCurrency(order.delivery_fee)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-1 border-t">
                        <span>Total</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm">
                      <p className="font-medium text-orange-700 dark:text-orange-400">Observações:</p>
                      <p className="text-muted-foreground mt-1">{order.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {order.status === 'ready' && (
                      <Button
                        className="flex-1"
                        size="lg"
                        onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Iniciar Entrega
                      </Button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <Button
                        className="flex-1"
                        size="lg"
                        variant="default"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Entrega
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
