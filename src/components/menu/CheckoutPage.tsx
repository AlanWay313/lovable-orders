import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  Check,
  Search,
  Tag,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
}

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Nome é obrigatório'),
  customerPhone: z.string().min(10, 'Telefone inválido'),
  customerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  street: z.string().min(3, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().min(8, 'CEP inválido'),
  reference: z.string().optional(),
  paymentMethod: z.enum(['online', 'cash', 'card_on_delivery', 'pix']),
  needsChange: z.boolean().optional(),
  changeFor: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutPageProps {
  companyId: string;
  companyName: string;
  deliveryFee: number;
  onBack: () => void;
  isStoreOpen?: boolean;
  pixKey?: string | null;
  pixKeyType?: string | null;
}

interface OrderSummary {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
}

export function CheckoutPage({ companyId, companyName, deliveryFee, onBack, isStoreOpen = true, pixKey, pixKeyType }: CheckoutPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'pix',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const zipCode = watch('zipCode');
  
  // Calculate discount
  const discountAmount = appliedCoupon 
    ? appliedCoupon.discount_type === 'percentage'
      ? (subtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;
  
  const total = subtotal - discountAmount + deliveryFee;

  const searchCep = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP e tente novamente',
          variant: 'destructive',
        });
        return;
      }

      setValue('street', data.logradouro || '');
      setValue('neighborhood', data.bairro || '');
      setValue('city', data.localidade || '');
      setValue('state', data.uf || '');
      if (data.complemento) {
        setValue('complement', data.complemento);
      }

      toast({
        title: 'Endereço encontrado',
        description: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
      });
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Tente novamente ou preencha manualmente',
        variant: 'destructive',
      });
    } finally {
      setLoadingCep(false);
    }
  }, [setValue, toast]);

  const handleCepBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    if (cep.replace(/\D/g, '').length === 8) {
      searchCep(cep);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setLoadingCoupon(true);
    setCouponError(null);

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('company_id', companyId)
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        setCouponError('Cupom não encontrado ou inválido');
        return;
      }

      // Check expiration
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setCouponError('Este cupom expirou');
        return;
      }

      // Check minimum order value
      if (coupon.min_order_value && subtotal < coupon.min_order_value) {
        setCouponError(`Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} para este cupom`);
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        setCouponError('Este cupom atingiu o limite de uso');
        return;
      }

      setAppliedCoupon(coupon);
      toast({
        title: 'Cupom aplicado!',
        description: coupon.discount_type === 'percentage' 
          ? `${coupon.discount_value}% de desconto` 
          : `R$ ${coupon.discount_value.toFixed(2)} de desconto`,
      });
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('Erro ao aplicar cupom');
    } finally {
      setLoadingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!isStoreOpen) {
      toast({
        title: 'Loja fechada',
        description: 'Esta loja está fechada no momento. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione itens antes de finalizar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Resolve the current auth user directly from the auth session.
      // This avoids cases where `useAuth()` hasn't hydrated yet but requests are still made as `authenticated`.
      const { data: authUserData } = await supabase.auth.getUser();
      const authUserId = authUserData.user?.id ?? null;
      const isAuthenticatedCheckout = Boolean(authUserId);

      // 1. Create address
      const { data: addressData, error: addressError } = await supabase
        .from('customer_addresses')
        .insert({
          user_id: authUserId,
          session_id: isAuthenticatedCheckout ? null : `guest-${crypto.randomUUID()}`,
          street: data.street,
          number: data.number,
          complement: data.complement || null,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          reference: data.reference || null,
        })
        .select()
        .single();

      if (addressError) throw addressError;

      // 2. Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          company_id: companyId,
          customer_id: authUserId,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_email: data.customerEmail || null,
          delivery_address_id: addressData.id,
          payment_method: data.paymentMethod,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          notes: data.notes || null,
          needs_change: data.paymentMethod === 'cash' ? data.needsChange : false,
          change_for: data.paymentMethod === 'cash' && data.needsChange ? data.changeFor : null,
          coupon_id: appliedCoupon?.id || null,
          discount_amount: discountAmount,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Create order items
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: (item.price + item.options.reduce((s, o) => s + o.priceModifier, 0)) * item.quantity,
        options: item.options,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 4. Update coupon usage if applied
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ current_uses: (appliedCoupon as any).current_uses + 1 })
          .eq('id', appliedCoupon.id);
      }

      // 5. If payment method is online, redirect to Stripe checkout
      if (data.paymentMethod === 'online') {
        const response = await supabase.functions.invoke('create-checkout', {
          body: {
            orderId: orderData.id,
            items: items.map(item => ({
              productName: item.productName,
              price: item.price,
              quantity: item.quantity,
              options: item.options,
            })),
            total,
            customerEmail: data.customerEmail || null,
            customerName: data.customerName,
          },
        });

        if (response.error) throw new Error(response.error.message);
        
        const { url } = response.data;
        if (url) {
          clearCart();
          window.location.href = url;
          return;
        }
      }

      // Success for non-online payments - save order summary before clearing cart
      setOrderSummary({
        subtotal,
        discountAmount,
        deliveryFee,
        total,
      });
      setOrderId(orderData.id);
      setOrderComplete(true);
      clearCart();

      toast({
        title: 'Pedido realizado!',
        description: `Pedido #${orderData.id.slice(0, 8)} enviado com sucesso`,
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro ao finalizar pedido',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Check className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground mb-6">
            Seu pedido #{orderId?.slice(0, 8)} foi enviado para {companyName}
          </p>
          <div className="bg-card rounded-xl border border-border p-6 mb-6 text-left">
            <h3 className="font-medium mb-4">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {(orderSummary?.subtotal ?? 0).toFixed(2)}</span>
              </div>
              {(orderSummary?.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Desconto</span>
                  <span>-R$ {(orderSummary?.discountAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega</span>
                <span>R$ {(orderSummary?.deliveryFee ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary">R$ {(orderSummary?.total ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <Button onClick={onBack} variant="outline" className="w-full">
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display font-bold">Finalizar Pedido</h1>
        </div>
      </header>

      <div className="container py-6 max-w-2xl">
        {/* Store Closed Warning */}
        {!isStoreOpen && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              A loja está fechada no momento. Não é possível finalizar pedidos.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Info */}
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Seus Dados
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nome *</Label>
                <Input
                  id="customerName"
                  placeholder="Seu nome completo"
                  {...register('customerName')}
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerPhone"
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                    {...register('customerPhone')}
                  />
                </div>
                {errors.customerPhone && (
                  <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customerEmail">Email (opcional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...register('customerEmail')}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Endereço de Entrega
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP *</Label>
                <div className="flex gap-2">
                  <Input
                    id="zipCode"
                    placeholder="00000-000"
                    {...register('zipCode')}
                    onBlur={handleCepBlur}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => searchCep(zipCode || '')}
                    disabled={loadingCep}
                  >
                    {loadingCep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.zipCode && (
                  <p className="text-sm text-destructive">{errors.zipCode.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  placeholder="Nome da rua"
                  {...register('street')}
                />
                {errors.street && (
                  <p className="text-sm text-destructive">{errors.street.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  placeholder="123"
                  {...register('number')}
                />
                {errors.number && (
                  <p className="text-sm text-destructive">{errors.number.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  placeholder="Apto, bloco..."
                  {...register('complement')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  placeholder="Nome do bairro"
                  {...register('neighborhood')}
                />
                {errors.neighborhood && (
                  <p className="text-sm text-destructive">{errors.neighborhood.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Nome da cidade"
                  {...register('city')}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  placeholder="SP"
                  {...register('state')}
                />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Ponto de referência</Label>
                <Input
                  id="reference"
                  placeholder="Próximo a..."
                  {...register('reference')}
                />
              </div>
            </div>
          </section>

          {/* Coupon */}
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Cupom de Desconto
            </h2>
            
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({appliedCoupon.discount_type === 'percentage' 
                      ? `${appliedCoupon.discount_value}%` 
                      : `R$ ${appliedCoupon.discount_value.toFixed(2)}`} de desconto)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={removeCoupon}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o código do cupom"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCoupon}
                    disabled={loadingCoupon}
                  >
                    {loadingCoupon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Aplicar'
                    )}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-sm text-destructive">{couponError}</p>
                )}
              </div>
            )}
          </section>

          {/* Payment Method */}
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Forma de Pagamento
            </h2>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setValue('paymentMethod', value as any)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label
                htmlFor="pix"
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'pix'
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="pix" id="pix" />
                <Smartphone className="h-5 w-5 text-primary" />
                <span>PIX</span>
              </Label>
              <Label
                htmlFor="cash"
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="h-5 w-5 text-primary" />
                <span>Dinheiro</span>
              </Label>
              <Label
                htmlFor="card_on_delivery"
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'card_on_delivery'
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="card_on_delivery" id="card_on_delivery" />
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Cartão na entrega</span>
              </Label>
              <Label
                htmlFor="online"
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'online'
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="online" id="online" />
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Cartão online</span>
              </Label>
            </RadioGroup>

            {/* PIX key display */}
            {paymentMethod === 'pix' && pixKey && (
              <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <span className="font-medium">Chave PIX para pagamento:</span>
                </div>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    {pixKeyType === 'cpf' && 'CPF'}
                    {pixKeyType === 'cnpj' && 'CNPJ'}
                    {pixKeyType === 'email' && 'Email'}
                    {pixKeyType === 'phone' && 'Telefone'}
                    {pixKeyType === 'random' && 'Chave Aleatória'}
                    {!pixKeyType && 'Chave'}
                  </p>
                  <p className="font-mono text-sm break-all select-all">{pixKey}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Realize o pagamento via PIX após confirmar o pedido
                </p>
              </div>
            )}

            {/* Cash change option */}
            {paymentMethod === 'cash' && (
              <div className="mt-4 p-4 rounded-lg border border-border bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needsChange"
                    {...register('needsChange')}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="needsChange" className="cursor-pointer">
                    Preciso de troco
                  </Label>
                </div>
                {watch('needsChange') && (
                  <div className="space-y-2">
                    <Label htmlFor="changeFor">Troco para quanto? (R$)</Label>
                    <Input
                      id="changeFor"
                      type="number"
                      step="0.01"
                      min={total}
                      placeholder={`Mínimo R$ ${total.toFixed(2)}`}
                      {...register('changeFor')}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-semibold mb-4">Observações do pedido</h2>
            <Textarea
              placeholder="Alguma observação para o restaurante?"
              {...register('notes')}
              rows={3}
            />
          </section>

          {/* Order Summary */}
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-semibold mb-4">Resumo do Pedido</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                    {item.options.length > 0 && (
                      <span className="text-muted-foreground text-xs block">
                        + {item.options.map(o => o.name).join(', ')}
                      </span>
                    )}
                  </span>
                  <span>
                    R$ {((item.price + item.options.reduce((s, o) => s + o.priceModifier, 0)) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>-R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            size="lg"
            disabled={loading || items.length === 0 || !isStoreOpen}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isStoreOpen ? `Confirmar Pedido - R$ ${total.toFixed(2)}` : 'Loja Fechada'}
          </Button>
        </form>
      </div>
    </div>
  );
}
