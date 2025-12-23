import { useState, useEffect } from 'react';
import {
  Bike,
  Car,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  MapPin,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type OrderStatus = Database['public']['Enums']['order_status'];

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

interface Driver {
  id: string;
  user_id: string;
  company_id: string;
  vehicle_type: string | null;
  license_plate: string | null;
  is_available: boolean | null;
  is_active: boolean | null;
  created_at: string;
  profile?: Profile;
  // For drivers without user account
  driver_name?: string;
  driver_phone?: string;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  total: number;
  delivery_driver_id: string | null;
  customer_addresses?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  };
}

const vehicleIcons: Record<string, typeof Car> = {
  moto: Bike,
  carro: Car,
  bicicleta: Bike,
};

export default function DriversManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('drivers');

  // Dialog states
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showEditDriver, setShowEditDriver] = useState(false);
  const [showDeleteDriver, setShowDeleteDriver] = useState(false);
  const [showAssignOrder, setShowAssignOrder] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('moto');
  const [newDriverPlate, setNewDriverPlate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!company) {
        setLoading(false);
        return;
      }

      setCompanyId(company.id);

      // Load drivers
      const { data: driversData, error: driversError } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (driversError) throw driversError;

      // Load profiles for each driver
      const driverUserIds = driversData?.map(d => d.user_id) || [];
      let profilesMap: Record<string, Profile> = {};

      if (driverUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', driverUserIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, Profile>);
        }
      }

      const driversWithProfiles = (driversData || []).map(driver => ({
        ...driver,
        profile: profilesMap[driver.user_id],
      }));

      setDrivers(driversWithProfiles);

      // Load orders ready for delivery or out for delivery
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, created_at, customer_name, customer_phone, status, total, delivery_driver_id,
          customer_addresses:delivery_address_id (street, number, neighborhood, city)
        `)
        .eq('company_id', company.id)
        .in('status', ['ready', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
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

  const handleAddDriver = async () => {
    if (!companyId || !newDriverName) return;

    setSaving(true);
    try {
      // Create driver record directly without user account
      const { error: driverError } = await supabase.from('delivery_drivers').insert({
        company_id: companyId,
        driver_name: newDriverName,
        driver_phone: newDriverPhone || null,
        vehicle_type: newDriverVehicle,
        license_plate: newDriverPlate || null,
        is_active: true,
        is_available: true,
      });

      if (driverError) throw driverError;

      toast({
        title: 'Entregador adicionado',
        description: `${newDriverName} foi adicionado como entregador`,
      });

      setShowAddDriver(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error adding driver:', error);
      toast({
        title: 'Erro ao adicionar entregador',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDriver = async () => {
    if (!selectedDriver) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .update({
          vehicle_type: newDriverVehicle,
          license_plate: newDriverPlate || null,
          is_active: selectedDriver.is_active,
        })
        .eq('id', selectedDriver.id);

      if (error) throw error;

      toast({
        title: 'Entregador atualizado',
        description: 'Dados do entregador atualizados com sucesso',
      });

      setShowEditDriver(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .delete()
        .eq('id', selectedDriver.id);

      if (error) throw error;

      toast({
        title: 'Entregador removido',
        description: 'O entregador foi removido com sucesso',
      });

      setShowDeleteDriver(false);
      setSelectedDriver(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (driver: Driver) => {
    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .update({ is_available: !driver.is_available })
        .eq('id', driver.id);

      if (error) throw error;

      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id ? { ...d, is_available: !d.is_available } : d
        )
      );

      toast({
        title: driver.is_available ? 'Entregador indisponível' : 'Entregador disponível',
        description: `${driver.profile?.full_name || 'Entregador'} agora está ${
          driver.is_available ? 'indisponível' : 'disponível'
        }`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAssignOrder = async (driverId: string) => {
    if (!selectedOrder) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_driver_id: driverId,
          status: 'out_for_delivery',
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: 'Pedido atribuído',
        description: 'O entregador foi atribuído ao pedido',
      });

      setShowAssignOrder(false);
      setSelectedOrder(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_driver_id: null,
          status: 'ready',
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Atribuição removida',
        description: 'O pedido voltou para "Pronto para entrega"',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover atribuição',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverVehicle('moto');
    setNewDriverPlate('');
    setSelectedDriver(null);
  };

  const openEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setNewDriverVehicle(driver.vehicle_type || 'moto');
    setNewDriverPlate(driver.license_plate || '');
    setShowEditDriver(true);
  };

  const availableDrivers = drivers.filter((d) => d.is_available && d.is_active);
  const ordersWithoutDriver = orders.filter((o) => !o.delivery_driver_id);
  const ordersWithDriver = orders.filter((o) => o.delivery_driver_id);

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
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Nenhuma loja encontrada</h2>
            <p className="text-muted-foreground text-center mb-4">
              Você precisa cadastrar sua loja antes de gerenciar entregadores
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
            <h1 className="text-2xl font-bold font-display">Entregadores</h1>
            <p className="text-muted-foreground">
              Gerencie seus motoboys e atribua pedidos
            </p>
          </div>
          <Button onClick={() => setShowAddDriver(true)} className="gradient-primary text-primary-foreground">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Entregador
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drivers.length}</div>
              <p className="text-xs text-muted-foreground">entregadores cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableDrivers.length}</div>
              <p className="text-xs text-muted-foreground">prontos para entrega</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersWithoutDriver.length}</div>
              <p className="text-xs text-muted-foreground">pedidos sem entregador</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Entrega</CardTitle>
              <Bike className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersWithDriver.length}</div>
              <p className="text-xs text-muted-foreground">pedidos em rota</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="drivers" className="gap-2">
              <Truck className="h-4 w-4" />
              Entregadores
            </TabsTrigger>
            <TabsTrigger value="assign" className="gap-2">
              <Package className="h-4 w-4" />
              Atribuir Pedidos
              {ordersWithoutDriver.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {ordersWithoutDriver.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="mt-6">
            {drivers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum entregador</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Adicione entregadores para gerenciar suas entregas
                  </p>
                  <Button onClick={() => setShowAddDriver(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Entregador
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {drivers.map((driver) => {
                  const VehicleIcon = vehicleIcons[driver.vehicle_type || 'moto'] || Bike;
                  const activeOrders = orders.filter(
                    (o) => o.delivery_driver_id === driver.id
                  );

                  return (
                    <Card key={driver.id} className={!driver.is_active ? 'opacity-60' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <VehicleIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {driver.driver_name || driver.profile?.full_name || 'Sem nome'}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground capitalize">
                                {driver.vehicle_type || 'Moto'}
                                {driver.license_plate && ` - ${driver.license_plate}`}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDriver(driver)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDriver(driver);
                                  setShowDeleteDriver(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(driver.driver_phone || driver.profile?.phone) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${driver.driver_phone || driver.profile?.phone}`} className="hover:underline">
                              {driver.driver_phone || driver.profile?.phone}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {driver.is_available ? (
                              <Badge variant="default" className="bg-green-500">
                                Disponível
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Indisponível</Badge>
                            )}
                            {activeOrders.length > 0 && (
                              <Badge variant="outline">
                                {activeOrders.length} entrega(s)
                              </Badge>
                            )}
                          </div>
                          <Switch
                            checked={driver.is_available || false}
                            onCheckedChange={() => handleToggleAvailability(driver)}
                          />
                        </div>

                        {activeOrders.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Entregas ativas:
                            </p>
                            {activeOrders.map((order) => (
                              <div
                                key={order.id}
                                className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                              >
                                <div>
                                  <span className="font-medium">#{order.id.slice(0, 8)}</span>
                                  <p className="text-xs text-muted-foreground">
                                    {order.customer_addresses?.neighborhood}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnassignOrder(order.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assign" className="mt-6">
            {ordersWithoutDriver.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Tudo certo!</h3>
                  <p className="text-muted-foreground text-center">
                    Todos os pedidos prontos já têm entregadores atribuídos
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ordersWithoutDriver.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{order.id.slice(0, 8)}</span>
                            <Badge variant="outline">Pronto</Badge>
                          </div>
                          <p className="text-sm">{order.customer_name}</p>
                          {order.customer_addresses && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.customer_addresses.street}, {order.customer_addresses.number} - {order.customer_addresses.neighborhood}
                            </p>
                          )}
                          <p className="text-sm font-medium">
                            R$ {order.total.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            onValueChange={(driverId) => {
                              setSelectedOrder(order);
                              handleAssignOrder(driverId);
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Atribuir entregador" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDrivers.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  Nenhum entregador disponível
                                </div>
                              ) : (
                                availableDrivers.map((driver) => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.driver_name || driver.profile?.full_name || 'Sem nome'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Driver Dialog */}
      <Dialog open={showAddDriver} onOpenChange={setShowAddDriver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Entregador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Nome completo *</Label>
              <Input
                id="driver-name"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Nome do entregador"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Telefone</Label>
              <Input
                id="driver-phone"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Telefone</Label>
              <Input
                id="driver-phone"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de veículo</Label>
                <Select value={newDriverVehicle} onValueChange={setNewDriverVehicle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-plate">Placa</Label>
                <Input
                  id="driver-plate"
                  value={newDriverPlate}
                  onChange={(e) => setNewDriverPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDriver(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddDriver}
              disabled={saving || !newDriverName}
              className="gradient-primary text-primary-foreground"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDriver} onOpenChange={setShowEditDriver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entregador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de veículo</Label>
                <Select value={newDriverVehicle} onValueChange={setNewDriverVehicle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plate">Placa</Label>
                <Input
                  id="edit-plate"
                  value={newDriverPlate}
                  onChange={(e) => setNewDriverPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDriver(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateDriver}
              disabled={saving}
              className="gradient-primary text-primary-foreground"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDriver} onOpenChange={setShowDeleteDriver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover entregador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O entregador será removido da sua equipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
