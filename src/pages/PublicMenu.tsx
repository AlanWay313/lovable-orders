import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Clock, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  Search, 
  ChevronRight,
  Store,
  AlertCircle,
  Package,
  Star,
  Plus,
  ArrowLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartProvider } from '@/hooks/useCart';
import { ProductModal, CartDrawer } from '@/components/menu/ProductModal';
import { CheckoutPage } from '@/components/menu/CheckoutPage';
import { TrackOrderModal } from '@/components/menu/TrackOrderModal';
import { cn } from '@/lib/utils';
import { checkStoreOpen, formatTodayHours } from '@/lib/storeHours';
import { OperatingHours } from '@/components/store/OperatingHoursEditor';
import { Json } from '@/integrations/supabase/types';

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

function PublicMenuContent() {
  const { slug } = useParams<{ slug: string }>();
  const { setCompanySlug, itemCount, subtotal } = useCart();

  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [trackOrderOpen, setTrackOrderOpen] = useState(false);

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

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`*, product_options (*)`)
        .eq('company_id', companyData.id)
        .eq('is_active', true);

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (err: any) {
      console.error('Error loading menu:', err);
      setError(err.message || 'Erro ao carregar cardápio');
    } finally {
      setLoading(false);
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
          <Button asChild size="lg">
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
    <div className="min-h-screen bg-background pb-28">
      {/* Hero / Cover */}
      <div className="relative h-44 sm:h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        {company.cover_url ? (
          <img
            src={company.cover_url}
            alt={company.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Back Button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-background transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Company Card */}
      <div className="container -mt-20 relative z-10 px-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
          <div className="flex gap-4">
            {/* Logo */}
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-background shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-md flex-shrink-0">
                <Store className="h-10 w-10 text-primary-foreground" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-display font-bold truncate">{company.name}</h1>
                <Badge
                  variant="secondary"
                  className={cn(
                    'flex-shrink-0',
                    isActuallyOpen ? 'badge-open' : 'badge-closed'
                  )}
                >
                  {isActuallyOpen ? 'Aberto' : 'Fechado'}
                </Badge>
              </div>

              {company.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{company.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                {todayHours && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{todayHours}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>4.8</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Pills */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm">
              <span className="font-medium">Taxa:</span>
              <span>R$ {Number(company.delivery_fee).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm">
              <span className="font-medium">Mín:</span>
              <span>R$ {Number(company.min_order_value).toFixed(2)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTrackOrderOpen(true)}
              className="h-8 px-3 text-sm"
            >
              <Package className="mr-1.5 h-4 w-4" />
              Acompanhar pedido
            </Button>
          </div>

          {/* Contact */}
          {(company.address || company.phone) && (
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {company.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{company.address}, {company.city}</span>
                </div>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>{company.phone}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Closed Store Warning */}
      {!isActuallyOpen && (
        <div className="container mt-4 px-4">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
            <p className="text-sm text-destructive font-medium text-center">
              {storeStatus?.reason === 'manual_closed' && 'Esta loja está fechada no momento.'}
              {storeStatus?.reason === 'day_closed' && 'Esta loja não abre hoje.'}
              {storeStatus?.reason === 'outside_hours' && 'Fora do horário de funcionamento.'}
            </p>
            {storeStatus?.nextOpenTime && (
              <p className="text-xs text-muted-foreground text-center mt-1">{storeStatus.nextOpenTime}</p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="container mt-6 px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-border bg-card text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mt-6">
          <div className="container px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'category-pill whitespace-nowrap',
                  selectedCategory === null && 'active'
                )}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'category-pill whitespace-nowrap',
                    selectedCategory === category.id && 'active'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && !searchQuery && !selectedCategory && (
        <div className="container mt-8 px-4">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <h2 className="text-lg font-display font-bold">Destaques</h2>
          </div>
          <div className="grid gap-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
                featured
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
          <div key={category.id} className="container mt-8 px-4">
            <h2 className="text-lg font-display font-bold mb-4">{category.name}</h2>
            <div className="grid gap-3">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Uncategorized Products */}
      {filteredProducts.filter((p) => !p.category_id).length > 0 && (
        <div className="container mt-8 px-4">
          <h2 className="text-lg font-display font-bold mb-4">Outros</h2>
          <div className="grid gap-3">
            {filteredProducts
              .filter((p) => !p.category_id)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="container mt-16 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
          {searchQuery && (
            <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
              Limpar busca
            </Button>
          )}
        </div>
      )}

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <Button
            className="w-full gradient-primary text-primary-foreground shadow-xl h-14 text-base rounded-2xl floating-button"
            onClick={() => setCartOpen(true)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="font-semibold">Ver carrinho</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {itemCount}
                </Badge>
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

function ProductCard({
  product,
  onClick,
  featured = false,
}: {
  product: Product;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'product-card flex gap-4 p-4 text-left w-full group',
        featured && 'ring-1 ring-primary/20 bg-primary/[0.02]'
      )}
    >
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {product.name}
          </h3>
          {featured && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0 flex-shrink-0">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Destaque
            </Badge>
          )}
        </div>
        
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-primary">
              R$ {Number(product.price).toFixed(2)}
            </p>
            {product.product_options && product.product_options.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                +{product.product_options.length} adicionais
              </p>
            )}
          </div>
          
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Plus className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Image */}
      {product.image_url && (
        <div className="relative flex-shrink-0">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover"
          />
        </div>
      )}
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-44 sm:h-56 w-full" />
      <div className="container -mt-20 relative z-10 px-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-full max-w-xs mb-3" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mt-6 px-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="container mt-6 px-4">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>
      <div className="container mt-8 px-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
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
