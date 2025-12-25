import { useState, useEffect, useCallback, useRef } from 'react';
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
  RefreshCw,
  LogOut,
  MapPinOff,
  Play,
  ThumbsUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeDriverOrders } from '@/hooks/useRealtimeDriverOrders';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: { name: string; priceModifier?: number }[] | null;
  notes: string | null;
}

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
  order_items: OrderItem[];
}

export default function DriverDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const driverIdRef = useRef<string | null>(null);

  // Update driver location in database
  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!driverIdRef.current) return;

    const { latitude, longitude } = position.coords;
    console.log('Updating driver location:', { latitude, longitude });

    await supabase
      .from('delivery_drivers')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', driverIdRef.current);
  }, []);

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      toast.error('Geolocalização não suportada pelo navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('granted');
        updateLocation(position);
        toast.success('Localização ativada');
        
        // Start continuous tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          updateLocation,
          (error) => console.error('Watch position error:', error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        // Fallback interval
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            updateLocation,
            (error) => console.error('Interval position error:', error),
            { enableHighAccuracy: true }
          );
        }, 15000);
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          toast.error('Permissão de localização negada. Ative nas configurações do navegador.');
        } else {
          setLocationStatus('unavailable');
          toast.error('Erro ao obter localização');
        }
      },
      { enableHighAccuracy: true }
    );
  }, [updateLocation]);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Realtime subscription for driver orders
  useRealtimeDriverOrders({
    driverId: driver?.id || null,
    onOrderAssigned: () => {
      loadDriverData();
    },
    onOrderUpdate: (updatedOrder) => {
      setOrders(prev => 
        prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)
          .filter(o => ['awaiting_driver', 'ready', 'out_for_delivery'].includes(o.status))
      );
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadDriverData();
    
    return () => {
      stopLocationTracking();
    };
  }, [user, navigate, stopLocationTracking]);

  // Request location permission on mount
  useEffect(() => {
    if (driver?.id && locationStatus === 'pending') {
      driverIdRef.current = driver.id;
      startLocationTracking();
    }
  }, [driver?.id, locationStatus, startLocationTracking]);

  const loadDriverData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get first active driver for this user
      const { data: driverData, error: driverError } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (driverError) {
        console.error('Driver fetch error:', driverError);
        throw driverError;
      }
      
      if (!driverData) {
        console.log('No active driver found for user:', user.id);
        toast.error('Você não está cadastrado como entregador ativo');
        await signOut();
        navigate('/driver/login');
        return;
      }

      console.log('Driver loaded:', driverData);
      setDriver(driverData);
      driverIdRef.current = driverData.id;

      // Load assigned orders - include awaiting_driver status
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_address:customer_addresses(street, number, neighborhood, city, state, complement, reference, zip_code),
          company:companies(name, address, phone, city),
          order_items(id, product_name, quantity, unit_price, total_price, options, notes)
        `)
        .eq('delivery_driver_id', driverData.id)
        .in('status', ['awaiting_driver', 'ready', 'out_for_delivery'])
        .order('created_at', { ascending: true });

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw ordersError;
      }

      setOrders(ordersData?.map(order => ({
        ...order,
        delivery_address: order.delivery_address as Order['delivery_address'],
        company: order.company as Order['company'],
        order_items: (order.order_items || []) as OrderItem[],
      })) || []);

    } catch (error) {
      console.error('Error loading driver data:', error);
      toast.error('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user, navigate, signOut]);

  const toggleAvailability = async () => {
    if (!driver) return;

    const newStatus = !driver.is_available;
    const { error } = await supabase
      .from('delivery_drivers')
      .update({ 
        is_available: newStatus,
        driver_status: newStatus ? 'available' : 'offline'
      })
      .eq('id', driver.id);

    if (error) {
      toast.error('Erro ao atualizar disponibilidade');
      return;
    }

    setDriver({ ...driver, is_available: newStatus });
    toast.success(newStatus ? 'Você está disponível para entregas' : 'Você está indisponível');
  };

  // Accept delivery - changes status from awaiting_driver to ready
  const acceptDelivery = async (orderId: string) => {
    setUpdatingOrder(orderId);
    
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId);

    if (orderError) {
      toast.error('Erro ao aceitar entrega');
      setUpdatingOrder(null);
      return;
    }

    // Update driver status to in_delivery
    await supabase
      .from('delivery_drivers')
      .update({ driver_status: 'in_delivery' })
      .eq('id', driver.id);

    toast.success('Entrega aceita! Inicie quando estiver pronto.');
    loadDriverData();
    setUpdatingOrder(null);
  };

  // Start delivery - changes status to out_for_delivery
  const startDelivery = async (orderId: string) => {
    setUpdatingOrder(orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ status: 'out_for_delivery' })
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao iniciar entrega');
      setUpdatingOrder(null);
      return;
    }

    toast.success('Entrega iniciada! Boa viagem.');
    loadDriverData();
    setUpdatingOrder(null);
  };

  // Complete delivery
  const completeDelivery = async (orderId: string) => {
    setUpdatingOrder(orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao concluir entrega');
      setUpdatingOrder(null);
      return;
    }

    // Check if there are more pending orders for this driver
    const remainingOrders = orders.filter(o => o.id !== orderId);
    
    // If no more orders, set driver back to available
    if (remainingOrders.length === 0) {
      await supabase
        .from('delivery_drivers')
        .update({ 
          driver_status: 'available',
          is_available: true
        })
        .eq('id', driver.id);
    }

    toast.success('Entrega concluída com sucesso!');
    loadDriverData();
    setUpdatingOrder(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_driver':
        return <Badge variant="destructive">Aguardando Aceite</Badge>;
      case 'ready':
        return <Badge variant="secondary">Aceito - Aguardando Início</Badge>;
      case 'out_for_delivery':
        return <Badge variant="default">Em Entrega</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show location warning as a dismissible card instead of blocking the whole UI
  const LocationWarning = () => {
    if (locationStatus === 'denied' || locationStatus === 'unavailable') {
      return (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <MapPinOff className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {locationStatus === 'denied' 
                    ? 'Localização bloqueada' 
                    : 'Localização indisponível'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {locationStatus === 'denied' 
                    ? 'Ative a permissão de localização nas configurações do navegador para rastreamento em tempo real.'
                    : 'Seu navegador não suporta geolocalização.'
                  }
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setLocationStatus('pending');
                  startLocationTracking();
                }}
              >
                Tentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

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
            <div className="flex items-center gap-2">
              <Badge variant={locationStatus === 'granted' ? 'default' : 'destructive'} className="gap-1">
                <Navigation className="h-3 w-3" />
                {locationStatus === 'granted' ? 'GPS Ativo' : 'GPS'}
              </Badge>
              <Badge variant={driver?.is_available ? 'default' : 'secondary'}>
                {driver?.is_available ? 'Disponível' : 'Indisponível'}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  stopLocationTracking();
                  await signOut();
                  navigate('/driver/login');
                }}
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Location Warning */}
        <LocationWarning />
        
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
                disabled={orders.length > 0}
              />
            </div>
            
            {orders.length > 0 && (
              <p className="text-xs text-muted-foreground">
                * Disponibilidade bloqueada enquanto houver entregas pendentes
              </p>
            )}

            <div className="pt-2 border-t border-border">
              <PushNotificationButton
                companyId={driver?.company_id}
                userId={user?.id}
                userType="driver"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Entregas ({orders.length})
            </h2>
            <Button variant="outline" size="sm" onClick={loadDriverData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma entrega pendente</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order, index) => (
              <Card key={order.id} className={order.status === 'awaiting_driver' ? 'ring-2 ring-destructive animate-pulse' : index === 0 ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.status === 'awaiting_driver' && (
                        <Badge variant="destructive" className="text-xs animate-bounce">Nova!</Badge>
                      )}
                      {order.status !== 'awaiting_driver' && index === 0 && (
                        <Badge variant="outline" className="text-xs">Próxima</Badge>
                      )}
                      <CardTitle className="text-base">{order.company.name}</CardTitle>
                    </div>
                    {getStatusBadge(order.status)}
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

                  {/* Order Items */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                      <p className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Itens do Pedido
                      </p>
                      <div className="space-y-2">
                        {order.order_items.map((item) => {
                          const options = Array.isArray(item.options) ? item.options : [];
                          return (
                            <div key={item.id} className="text-sm pb-2 border-b border-border/50 last:border-0 last:pb-0">
                              <div className="flex justify-between">
                                <span>
                                  <span className="font-medium">{item.quantity}x</span> {item.product_name}
                                </span>
                                <span className="text-muted-foreground">{formatCurrency(item.total_price)}</span>
                              </div>
                              {options.length > 0 && (
                                <p className="text-xs text-muted-foreground ml-4">
                                  + {options.map((o) => o.name).join(', ')}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 ml-4 italic">
                                  Obs: {item.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                    {order.status === 'awaiting_driver' && (
                      <Button
                        className="flex-1"
                        size="lg"
                        variant="destructive"
                        onClick={() => acceptDelivery(order.id)}
                        disabled={updatingOrder === order.id}
                      >
                        {updatingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-4 w-4 mr-2" />
                        )}
                        Aceitar Entrega
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button
                        className="flex-1"
                        size="lg"
                        onClick={() => startDelivery(order.id)}
                        disabled={updatingOrder === order.id}
                      >
                        {updatingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Iniciar Entrega
                      </Button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <Button
                        className="flex-1"
                        size="lg"
                        variant="default"
                        onClick={() => completeDelivery(order.id)}
                        disabled={updatingOrder === order.id}
                      >
                        {updatingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Concluir Entrega
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
