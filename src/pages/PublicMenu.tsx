import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Clock, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  Search, 
  Store,
  AlertCircle,
  Package,
  Star,
  Plus,
  Minus,
  ArrowLeft,
  X,
  ChevronRight,
  Flame,
  Check,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartProvider, CartItem } from '@/hooks/useCart';
import { ProductModal, CartDrawer } from '@/components/menu/ProductModal';
import { CheckoutPage } from '@/components/menu/CheckoutPage';
import { TrackOrderModal } from '@/components/menu/TrackOrderModal';
import { cn } from '@/lib/utils';
import { checkStoreOpen, formatTodayHours } from '@/lib/storeHours';
import { OperatingHours } from '@/components/store/OperatingHoursEditor';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  is_open: boolean;
  delivery_fee: number;
  min_order_value: number;
  primary_color: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  opening_hours: Json | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  product_options?: {
    id: string;
    name: string;
    price_modifier: number;
    is_required: boolean;
  }[];
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  product_id: string | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  expires_at: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  product_options?: {
    id: string;
    name: string;
    price_modifier: number;
    is_required: boolean;
  }[];
}

function PublicMenuContent() {
  const { slug } = useParams<{ slug: string }>();
  const { setCompanySlug, items, itemCount, subtotal, addItem, updateQuantity, removeItem } = useCart();
  const categoriesRef = useRef<HTMLDivElement>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [trackOrderOpen, setTrackOrderOpen] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [cartBounce, setCartBounce] = useState(false);

  useEffect(() => {
    if (slug) {
      setCompanySlug(slug);
      loadCompanyData();
    }
  }, [slug]);

  const loadCompanyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'approved')
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companyData) {
        setError('Empresa não encontrada');
        setLoading(false);
        return;
      }

      setCompany(companyData);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      const [productsRes, promotionsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`*, product_options (*)`)
          .eq('company_id', companyData.id)
          .eq('is_active', true),
        supabase
          .from('promotions')
          .select('*')
          .eq('company_id', companyData.id)
          .eq('is_active', true),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (promotionsRes.error) throw promotionsRes.error;

      setProducts(productsRes.data || []);
      setPromotions(promotionsRes.data || []);
    } catch (err: any) {
      console.error('Error loading menu:', err);
      setError(err.message || 'Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  // Get quantity of product in cart
  const getProductQuantityInCart = (productId: string): number => {
    return items
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Quick add without options
  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.product_options && product.product_options.length > 0) {
      setSelectedProduct(product);
    } else {
      addItem({
        productId: product.id,
        productName: product.name,
        price: Number(product.price),
        quantity: 1,
        options: [],
        imageUrl: product.image_url || undefined,
      });
      
      // Trigger animations
      setRecentlyAddedId(product.id);
      setCartBounce(true);
      
      // Show toast feedback
      toast.success(`${product.name} adicionado!`, {
        duration: 2000,
        position: 'top-center',
      });
      
      // Reset animations
      setTimeout(() => {
        setRecentlyAddedId(null);
        setCartBounce(false);
      }, 600);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = products.filter((p) => p.is_featured);

  const openingHours = company?.opening_hours as unknown as OperatingHours | null;
  const storeStatus = company ? checkStoreOpen(company.is_open, openingHours) : null;
  const isActuallyOpen = storeStatus?.isOpen ?? false;
  const todayHours = company ? formatTodayHours(openingHours) : null;

  const beverageCategory = categories.find(c => 
    c.name.toLowerCase().includes('bebida') || 
    c.name.toLowerCase().includes('drink') ||
    c.name.toLowerCase().includes('refrigerante') ||
    c.name.toLowerCase().includes('suco')
  );
  
  const suggestedBeverages = beverageCategory 
    ? products.filter(p => p.category_id === beverageCategory.id).slice(0, 5)
    : products.filter(p => 
        p.name.toLowerCase().includes('refrigerante') ||
        p.name.toLowerCase().includes('suco') ||
        p.name.toLowerCase().includes('água') ||
        p.name.toLowerCase().includes('bebida')
      ).slice(0, 5);

  const scrollToCategory = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        const headerOffset = 180;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Ops!</h1>
          <p className="text-muted-foreground mb-8">{error || 'Empresa não encontrada'}</p>
          <Button asChild size="lg" className="h-12 px-8">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (checkoutMode) {
    return (
      <CheckoutPage
        companyId={company.id}
        companyName={company.name}
        deliveryFee={Number(company.delivery_fee) || 0}
        minOrderValue={Number(company.min_order_value) || 0}
        onBack={() => setCheckoutMode(false)}
        isStoreOpen={isActuallyOpen}
        pixKey={company.pix_key}
        pixKeyType={company.pix_key_type}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Restaurant Header with Cover & Logo */}
      <div className="relative">
        {/* Cover Image */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-br from-primary/20 to-secondary">
          {company.cover_url ? (
            <img
              src={company.cover_url}
              alt={`Capa de ${company.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full gradient-primary opacity-80" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          {/* Back Button */}
          <Link 
            to="/" 
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors active:scale-95 shadow-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Track Order Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTrackOrderOpen(true)}
            className="absolute top-4 right-4 h-10 w-10 p-0 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-md"
          >
            <Package className="h-5 w-5" />
          </Button>
        </div>

        {/* Restaurant Info Card */}
        <div className="relative -mt-12 mx-4 p-4 bg-card rounded-2xl shadow-lg border border-border">
          <div className="flex gap-4">
            {/* Logo */}
            <div className="flex-shrink-0 -mt-10">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-card shadow-md"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl gradient-primary flex items-center justify-center border-4 border-card shadow-md">
                  <Store className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="font-display font-bold text-lg sm:text-xl truncate">{company.name}</h1>
              {company.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5">{company.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'h-6 text-xs px-2',
                    isActuallyOpen ? 'badge-open' : 'badge-closed'
                  )}
                >
                  {isActuallyOpen ? 'Aberto' : 'Fechado'}
                </Badge>
                {todayHours && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {todayHours}
                  </span>
                )}
                {company.delivery_fee !== null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Entrega R$ {Number(company.delivery_fee).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Search & Categories */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border mt-4">
        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="O que você quer pedir?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-border bg-secondary/50 text-sm placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories - Horizontal Scroll */}
        {categories.length > 0 && (
          <div 
            ref={categoriesRef}
            className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide"
          >
            <button
              onClick={() => scrollToCategory(null)}
              className={cn(
                'category-pill whitespace-nowrap flex-shrink-0',
                selectedCategory === null && 'active'
              )}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={cn(
                  'category-pill whitespace-nowrap flex-shrink-0',
                  selectedCategory === category.id && 'active'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Closed Store Warning */}
      {!isActuallyOpen && (
        <div className="mx-4 mt-4">
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">
                {storeStatus?.reason === 'manual_closed' && 'Loja fechada no momento'}
                {storeStatus?.reason === 'day_closed' && 'Não abrimos hoje'}
                {storeStatus?.reason === 'outside_hours' && 'Fora do horário'}
              </p>
              {storeStatus?.nextOpenTime && (
                <p className="text-xs text-muted-foreground">{storeStatus.nextOpenTime}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Promotions Banner - Horizontal Scroll */}
      {promotions.length > 0 && !searchQuery && !selectedCategory && (
        <div className="mt-6">
          <div className="flex items-center gap-2 px-4 mb-3">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-bold">Promoções</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {promotions.map((promo) => (
              <div 
                key={promo.id}
                className="flex-shrink-0 w-72 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20"
              >
                <div className="flex gap-3">
                  {promo.image_url ? (
                    <img
                      src={promo.image_url}
                      alt={promo.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Badge className="mb-1.5 bg-primary/90 text-primary-foreground">
                      {promo.discount_type === 'percentage' 
                        ? `${promo.discount_value}% OFF` 
                        : `R$ ${Number(promo.discount_value).toFixed(2)} OFF`}
                    </Badge>
                    <h3 className="font-semibold text-sm truncate">{promo.name}</h3>
                    {promo.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{promo.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Products - Horizontal Scroll */}
      {featuredProducts.length > 0 && !searchQuery && !selectedCategory && (
        <div className="mt-6">
          <div className="flex items-center gap-2 px-4 mb-3">
            <Flame className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-bold">Mais pedidos</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {featuredProducts.map((product) => (
              <FeaturedProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
                onQuickAdd={(e) => handleQuickAdd(product, e)}
                quantityInCart={getProductQuantityInCart(product.id)}
                isRecentlyAdded={recentlyAddedId === product.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Products by Category */}
      {categories.map((category) => {
        const categoryProducts = filteredProducts.filter(
          (p) => p.category_id === category.id
        );
        if (categoryProducts.length === 0) return null;

        return (
          <div key={category.id} id={`category-${category.id}`} className="mt-6">
            <h2 className="text-base font-display font-bold px-4 mb-3">{category.name}</h2>
            <div className="space-y-2 px-4">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                  onQuickAdd={(e) => handleQuickAdd(product, e)}
                  quantityInCart={getProductQuantityInCart(product.id)}
                  isRecentlyAdded={recentlyAddedId === product.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Uncategorized Products */}
      {filteredProducts.filter((p) => !p.category_id).length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-display font-bold px-4 mb-3">Outros</h2>
          <div className="space-y-2 px-4">
            {filteredProducts
              .filter((p) => !p.category_id)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                  onQuickAdd={(e) => handleQuickAdd(product, e)}
                  quantityInCart={getProductQuantityInCart(product.id)}
                  isRecentlyAdded={recentlyAddedId === product.id}
                />
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="mt-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">Nenhum item encontrado</p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')} className="h-10">
              Limpar busca
            </Button>
          )}
        </div>
      )}

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button
            className={cn(
              "w-full gradient-primary text-primary-foreground shadow-xl h-14 text-base rounded-2xl transition-all",
              cartBounce ? "scale-105 shadow-2xl" : "active:scale-[0.98]"
            )}
            onClick={() => setCartOpen(true)}
          >
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-2">
                <div className={cn("relative transition-transform", cartBounce && "animate-bounce")}>
                  <ShoppingBag className="h-5 w-5" />
                  <span className={cn(
                    "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center transition-transform",
                    cartBounce && "scale-125"
                  )}>
                    {itemCount}
                  </span>
                </div>
                <span className="font-semibold">Ver sacola</span>
              </div>
              <span className="font-bold text-lg">R$ {subtotal.toFixed(2)}</span>
            </div>
          </Button>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutMode(true);
        }}
        onContinueShopping={() => setCartOpen(false)}
        deliveryFee={Number(company.delivery_fee) || 0}
        suggestedProducts={suggestedBeverages.map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image_url: p.image_url
        }))}
        isStoreOpen={isActuallyOpen}
      />

      {/* Track Order Modal */}
      <TrackOrderModal
        open={trackOrderOpen}
        onClose={() => setTrackOrderOpen(false)}
        companyId={company.id}
      />
    </div>
  );
}

// Featured Product Card - Horizontal scroll variant
function FeaturedProductCard({
  product,
  onClick,
  onQuickAdd,
  quantityInCart,
  isRecentlyAdded,
}: {
  product: Product;
  onClick: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  quantityInCart: number;
  isRecentlyAdded?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 w-40 bg-card rounded-2xl border overflow-hidden text-left group transition-all active:scale-[0.98]",
        isRecentlyAdded 
          ? "border-primary ring-2 ring-primary/20 scale-[1.02]" 
          : "border-border hover:border-primary/30"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Quantity Badge with animation */}
        {quantityInCart > 0 && (
          <div className={cn(
            "absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg transition-transform",
            isRecentlyAdded && "animate-bounce"
          )}>
            {quantityInCart}
          </div>
        )}
        
        {/* Success overlay */}
        {isRecentlyAdded && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center animate-scale-in">
              <Check className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1">
          {product.name}
        </h3>
        <p className="text-primary font-bold text-sm">
          R$ {Number(product.price).toFixed(2)}
        </p>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={onQuickAdd}
        className={cn(
          "absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all",
          isRecentlyAdded
            ? "bg-green-500 text-white scale-110"
            : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90"
        )}
      >
        {isRecentlyAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </button>
  );
}

// Product Card - List variant
function ProductCard({
  product,
  onClick,
  onQuickAdd,
  quantityInCart,
  isRecentlyAdded,
}: {
  product: Product;
  onClick: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  quantityInCart: number;
  isRecentlyAdded?: boolean;
}) {
  const hasOptions = product.product_options && product.product_options.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex gap-3 p-3 rounded-2xl border bg-card text-left group transition-all active:scale-[0.99]',
        isRecentlyAdded 
          ? 'border-primary ring-2 ring-primary/20 scale-[1.01]' 
          : quantityInCart > 0 
            ? 'border-primary/30 bg-primary/[0.02]' 
            : 'border-border hover:border-primary/20'
      )}
    >
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col py-0.5">
        <h3 className="font-semibold text-[15px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <p className="text-base font-bold text-primary">
              R$ {Number(product.price).toFixed(2)}
            </p>
            {hasOptions && (
              <p className="text-[11px] text-muted-foreground">
                Personalizável
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image + Action */}
      <div className="relative flex-shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-24 h-24 rounded-xl object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-secondary flex items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Success overlay */}
        {isRecentlyAdded && (
          <div className="absolute inset-0 rounded-xl bg-primary/20 flex items-center justify-center animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-scale-in">
              <Check className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        )}
        
        {/* Quantity Badge or Add Button */}
        {quantityInCart > 0 ? (
          <div className={cn(
            "absolute -bottom-1 -right-1 h-7 min-w-7 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg transition-transform",
            isRecentlyAdded && "animate-bounce"
          )}>
            {quantityInCart}x
          </div>
        ) : (
          <button
            onClick={onQuickAdd}
            className={cn(
              "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all",
              isRecentlyAdded
                ? "bg-green-500 text-white scale-110"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90"
            )}
          >
            {isRecentlyAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="px-3 pb-3">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="flex gap-2 px-3 pb-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Featured Skeleton */}
      <div className="mt-6">
        <Skeleton className="h-5 w-32 mx-4 mb-3" />
        <div className="flex gap-3 overflow-hidden px-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-40 h-52 rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Products Skeleton */}
      <div className="mt-6 px-4">
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicMenu() {
  return (
    <CartProvider>
      <PublicMenuContent />
    </CartProvider>
  );
}
