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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartProvider } from '@/hooks/useCart';
import { ProductModal, CartDrawer } from '@/components/menu/ProductModal';
import { CheckoutPage } from '@/components/menu/CheckoutPage';
import { cn } from '@/lib/utils';

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
      // Load company
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

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load products with options
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_options (*)
        `)
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

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Featured products
  const featuredProducts = products.filter((p) => p.is_featured);

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Ops!</h1>
          <p className="text-muted-foreground mb-6">{error || 'Empresa não encontrada'}</p>
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
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
        onBack={() => setCheckoutMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero / Cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 to-primary/5">
        {company.cover_url && (
          <img
            src={company.cover_url}
            alt={company.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Company Info */}
      <div className="container -mt-16 relative z-10">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-20 h-20 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl gradient-primary flex items-center justify-center">
                  <Store className="h-10 w-10 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold font-display">{company.name}</h1>
                  {company.description && (
                    <p className="text-muted-foreground text-sm mt-1">{company.description}</p>
                  )}
                </div>
                <Badge
                  variant={company.is_open ? 'default' : 'secondary'}
                  className={company.is_open ? 'bg-success text-success-foreground' : ''}
                >
                  {company.is_open ? 'Aberto' : 'Fechado'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {company.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {company.address}, {company.city}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {company.phone}
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-3 text-sm">
                <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground">
                  Taxa: R$ {Number(company.delivery_fee).toFixed(2)}
                </div>
                <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground">
                  Pedido mín: R$ {Number(company.min_order_value).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="container mt-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? 'gradient-primary text-primary-foreground' : ''}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'whitespace-nowrap',
                  selectedCategory === category.id && 'gradient-primary text-primary-foreground'
                )}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && !searchQuery && !selectedCategory && (
        <div className="container mt-8">
          <h2 className="text-lg font-bold font-display mb-4">Destaques</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div key={category.id} className="container mt-8">
            <h2 className="text-lg font-bold font-display mb-4">{category.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="container mt-8">
          <h2 className="text-lg font-bold font-display mb-4">Outros</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="container mt-12 text-center">
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      )}

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <Button
            className="w-full gradient-primary text-primary-foreground shadow-lg h-14 text-base"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            Ver carrinho ({itemCount})
            <ChevronRight className="ml-auto h-5 w-5" />
            <span className="ml-2 font-bold">R$ {subtotal.toFixed(2)}</span>
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
        deliveryFee={Number(company.delivery_fee) || 0}
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
        'flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-left w-full group',
        featured && 'ring-2 ring-primary/20'
      )}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
        <p className="text-lg font-bold text-primary mt-2">
          R$ {Number(product.price).toFixed(2)}
        </p>
      </div>
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      )}
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-48 w-full" />
      <div className="container -mt-16 relative z-10">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex gap-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mt-6">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="container mt-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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