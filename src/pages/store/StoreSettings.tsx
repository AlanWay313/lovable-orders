import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Palette,
  Save,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const companySchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  slug: z.string().min(2, 'Slug é obrigatório').max(50).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().max(10).optional(),
  deliveryFee: z.coerce.number().min(0).default(0),
  minOrderValue: z.coerce.number().min(0).default(0),
  primaryColor: z.string().default('#10B981'),
  secondaryColor: z.string().default('#059669'),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  cover_url: string | null;
  delivery_fee: number;
  min_order_value: number;
  primary_color: string | null;
  secondary_color: string | null;
  is_open: boolean;
  status: string;
}

export default function StoreSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  const slug = watch('slug');

  useEffect(() => {
    loadCompany();
  }, [user]);

  const loadCompany = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompany(data);
        setLogoUrl(data.logo_url);
        setCoverUrl(data.cover_url);
        setIsOpen(data.is_open);
        reset({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zip_code || '',
          deliveryFee: Number(data.delivery_fee) || 0,
          minOrderValue: Number(data.min_order_value) || 0,
          primaryColor: data.primary_color || '#10B981',
          secondaryColor: data.secondary_color || '#059669',
        });
      }
    } catch (error: any) {
      console.error('Error loading company:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    if (!user) return;

    setSaving(true);
    try {
      const companyData = {
        owner_id: user.id,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zipCode || null,
        logo_url: logoUrl,
        cover_url: coverUrl,
        delivery_fee: data.deliveryFee,
        min_order_value: data.minOrderValue,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        is_open: isOpen,
      };

      if (company) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', company.id);

        if (error) throw error;

        toast({
          title: 'Loja atualizada',
          description: 'As configurações foram salvas com sucesso',
        });
      } else {
        // Create new company
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert(companyData)
          .select()
          .single();

        if (error) {
          if (error.message.includes('duplicate key') || error.message.includes('unique')) {
            toast({
              title: 'Slug já existe',
              description: 'Escolha outro nome para a URL da sua loja',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        // Add store_owner role
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: 'store_owner',
        });

        setCompany(newCompany);
        toast({
          title: 'Loja criada!',
          description: 'Sua loja foi cadastrada e está aguardando aprovação',
        });
      }

      loadCompany();
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = async () => {
    if (!company) return;

    const newValue = !isOpen;
    setIsOpen(newValue);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_open: newValue })
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: newValue ? 'Loja aberta' : 'Loja fechada',
        description: newValue
          ? 'Sua loja está recebendo pedidos'
          : 'Sua loja não está recebendo pedidos',
      });
    } catch (error: any) {
      setIsOpen(!newValue);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">
              {company ? 'Configurações da Loja' : 'Cadastrar Loja'}
            </h1>
            <p className="text-muted-foreground">
              {company
                ? 'Gerencie as informações da sua loja'
                : 'Preencha os dados para criar sua loja'}
            </p>
          </div>
          {company && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Loja</span>
                <Switch checked={isOpen} onCheckedChange={toggleOpen} />
                <span className="text-sm font-medium">
                  {isOpen ? 'Aberta' : 'Fechada'}
                </span>
              </div>
              {company.status === 'approved' && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/menu/${company.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Cardápio
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status Alert */}
        {company && company.status === 'pending' && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">Aguardando aprovação</p>
                <p className="text-sm text-muted-foreground">
                  Sua loja está em análise e será aprovada em breve
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Imagens
              </CardTitle>
              <CardDescription>Logo e capa da sua loja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Logo</Label>
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    folder={user?.id || 'temp'}
                    aspectRatio="square"
                    className="max-w-[200px]"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Capa</Label>
                  <ImageUpload
                    value={coverUrl}
                    onChange={setCoverUrl}
                    folder={user?.id || 'temp'}
                    aspectRatio="video"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Loja *</Label>
                  <Input
                    id="name"
                    placeholder="Nome da sua loja"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL da Loja *</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      /menu/
                    </span>
                    <Input
                      id="slug"
                      placeholder="minha-loja"
                      className="rounded-l-none"
                      {...register('slug')}
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-sm text-destructive">{errors.slug.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva sua loja..."
                  rows={3}
                  {...register('description')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    {...register('phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="loja@email.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número"
                    {...register('address')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Cidade"
                    {...register('city')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      placeholder="SP"
                      maxLength={2}
                      {...register('state')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      {...register('zipCode')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Configurações de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('deliveryFee')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minOrderValue">Pedido Mínimo (R$)</Label>
                  <Input
                    id="minOrderValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('minOrderValue')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Cores do Cardápio
              </CardTitle>
              <CardDescription>
                Personalize as cores do seu cardápio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer"
                      {...register('primaryColor')}
                    />
                    <Input
                      {...register('primaryColor')}
                      placeholder="#10B981"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer"
                      {...register('secondaryColor')}
                    />
                    <Input
                      {...register('secondaryColor')}
                      placeholder="#059669"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full gradient-primary text-primary-foreground"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {company ? 'Salvar Alterações' : 'Criar Loja'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}