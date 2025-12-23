import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Check, 
  X, 
  Pause, 
  Eye,
  Building2,
  Users,
  ShoppingBag,
  TrendingUp,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

type CompanyStatus = 'pending' | 'approved' | 'suspended';

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: CompanyStatus;
  is_open: boolean;
  created_at: string;
  owner_id: string;
  logo_url: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  suspended: number;
}

export default function AdminCompanies() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    company: Company | null;
    action: 'approve' | 'suspend' | 'delete' | null;
  }>({ open: false, company: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Detail modal state
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    company: Company | null;
  }>({ open: false, company: null });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []) as Company[];
      setCompanies(typedData);

      // Calculate stats
      setStats({
        total: typedData.length,
        pending: typedData.filter((c) => c.status === 'pending').length,
        approved: typedData.filter((c) => c.status === 'approved').length,
        suspended: typedData.filter((c) => c.status === 'suspended').length,
      });
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({
        title: 'Erro ao carregar empresas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal.company || !actionModal.action) return;

    setActionLoading(true);
    try {
      let newStatus: CompanyStatus | undefined;

      switch (actionModal.action) {
        case 'approve':
          newStatus = 'approved';
          break;
        case 'suspend':
          newStatus = 'suspended';
          break;
        case 'delete':
          // For now, we'll suspend instead of delete to preserve data
          newStatus = 'suspended';
          break;
      }

      if (newStatus) {
        const { error } = await supabase
          .from('companies')
          .update({ status: newStatus })
          .eq('id', actionModal.company.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: `Empresa ${actionModal.action === 'approve' ? 'aprovada' : 'suspensa'} com sucesso`,
        });

        loadCompanies();
      }
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setActionModal({ open: false, company: null, action: null });
    }
  };

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: CompanyStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Aprovada</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Suspensa</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">Gerenciar Empresas</h1>
            <p className="text-muted-foreground">Aprove e gerencie as empresas cadastradas</p>
          </div>
          <Button onClick={loadCompanies} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-warning/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-warning">Pendentes</CardTitle>
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                <Pause className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-success/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-success">Aprovadas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Suspensas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.suspended}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, slug ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="suspended">Suspensas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {company.logo_url ? (
                              <img
                                src={company.logo_url}
                                alt={company.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{company.name}</p>
                              <p className="text-sm text-muted-foreground">{company.email || '-'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {company.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          {company.city && company.state
                            ? `${company.city}, ${company.state}`
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(company.status)}</TableCell>
                        <TableCell>
                          {new Date(company.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setDetailModal({ open: true, company })}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {company.status === 'approved' && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/menu/${company.slug}`} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver cardápio
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {company.status !== 'approved' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setActionModal({ open: true, company, action: 'approve' })
                                  }
                                  className="text-success"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Aprovar
                                </DropdownMenuItem>
                              )}
                              {company.status !== 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setActionModal({ open: true, company, action: 'suspend' })
                                  }
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Modal */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open) => !open && setActionModal({ open: false, company: null, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.action === 'approve' && 'Aprovar Empresa'}
              {actionModal.action === 'suspend' && 'Suspender Empresa'}
            </DialogTitle>
            <DialogDescription>
              {actionModal.action === 'approve' &&
                `Tem certeza que deseja aprovar a empresa "${actionModal.company?.name}"? Ela poderá receber pedidos.`}
              {actionModal.action === 'suspend' &&
                `Tem certeza que deseja suspender a empresa "${actionModal.company?.name}"? Ela não aparecerá para os clientes.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionModal({ open: false, company: null, action: null })}
            >
              Cancelar
            </Button>
            <Button
              variant={actionModal.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionModal.action === 'approve' ? 'Aprovar' : 'Suspender'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog
        open={detailModal.open}
        onOpenChange={(open) => !open && setDetailModal({ open: false, company: null })}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailModal.company?.logo_url ? (
                <img
                  src={detailModal.company.logo_url}
                  alt={detailModal.company.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              )}
              {detailModal.company?.name}
            </DialogTitle>
          </DialogHeader>
          {detailModal.company && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {detailModal.company.slug}
                  </code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(detailModal.company.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{detailModal.company.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{detailModal.company.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium">{detailModal.company.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium">{detailModal.company.state || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cadastro</p>
                  <p className="font-medium">
                    {new Date(detailModal.company.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status da Loja</p>
                  <Badge variant={detailModal.company.is_open ? 'default' : 'secondary'}>
                    {detailModal.company.is_open ? 'Aberta' : 'Fechada'}
                  </Badge>
                </div>
              </div>
              
              {detailModal.company.status === 'approved' && (
                <Button asChild className="w-full">
                  <Link to={`/menu/${detailModal.company.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Cardápio
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}