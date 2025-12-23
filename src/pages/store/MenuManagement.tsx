import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Search,
  FolderOpen,
  Package,
  Loader2,
  MoreVertical,
  Eye,
  EyeOff,
  Star,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
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
  preparation_time_minutes: number;
}

export default function MenuManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: null as string | null,
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Product Modal
  const [productModal, setProductModal] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: null as string | null,
    category_id: '',
    preparation_time_minutes: '30',
    is_featured: false,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Delete Confirmation
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: 'category' | 'product';
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadCompanyAndData();
  }, [user]);

  const loadCompanyAndData = async () => {
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

      // Load categories and products
      const [categoriesRes, productsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('company_id', company.id)
          .order('sort_order'),
        supabase
          .from('products')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
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

  // Category handlers
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        image_url: category.image_url,
      });
    } else {
      setCategoryForm({ name: '', description: '', image_url: null });
    }
    setCategoryModal({ open: true, category: category || null });
  };

  const saveCategory = async () => {
    if (!companyId || !categoryForm.name.trim()) return;

    setSavingCategory(true);
    try {
      const data = {
        company_id: companyId,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        image_url: categoryForm.image_url,
        sort_order: categoryModal.category?.sort_order ?? categories.length,
      };

      if (categoryModal.category) {
        const { error } = await supabase
          .from('categories')
          .update(data)
          .eq('id', categoryModal.category.id);
        if (error) throw error;
        toast({ title: 'Categoria atualizada' });
      } else {
        const { error } = await supabase.from('categories').insert(data);
        if (error) throw error;
        toast({ title: 'Categoria criada' });
      }

      setCategoryModal({ open: false, category: null });
      loadCompanyAndData();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleCategoryActive = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);
      if (error) throw error;
      loadCompanyAndData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // Product handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        image_url: product.image_url,
        category_id: product.category_id || '',
        preparation_time_minutes: product.preparation_time_minutes?.toString() || '30',
        is_featured: product.is_featured,
      });
    } else {
      setProductForm({
        name: '',
        description: '',
        price: '',
        image_url: null,
        category_id: '',
        preparation_time_minutes: '30',
        is_featured: false,
      });
    }
    setProductModal({ open: true, product: product || null });
  };

  const saveProduct = async () => {
    if (!companyId || !productForm.name.trim() || !productForm.price) return;

    setSavingProduct(true);
    try {
      const data = {
        company_id: companyId,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: parseFloat(productForm.price),
        image_url: productForm.image_url,
        category_id: productForm.category_id || null,
        preparation_time_minutes: parseInt(productForm.preparation_time_minutes) || 30,
        is_featured: productForm.is_featured,
      };

      if (productModal.product) {
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', productModal.product.id);
        if (error) throw error;
        toast({ title: 'Produto atualizado' });
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        toast({ title: 'Produto criado' });
      }

      setProductModal({ open: false, product: null });
      loadCompanyAndData();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (error) throw error;
      loadCompanyAndData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const toggleProductFeatured = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: !product.is_featured })
        .eq('id', product.id);
      if (error) throw error;
      loadCompanyAndData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteModal) return;

    try {
      const table = deleteModal.type === 'category' ? 'categories' : 'products';
      const { error } = await supabase.from(table).delete().eq('id', deleteModal.id);
      if (error) throw error;

      toast({ title: `${deleteModal.type === 'category' ? 'Categoria' : 'Produto'} excluído` });
      setDeleteModal(null);
      loadCompanyAndData();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Nenhuma loja encontrada</h2>
            <p className="text-muted-foreground text-center mb-4">
              Você precisa cadastrar sua loja antes de gerenciar o cardápio
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
            <h1 className="text-2xl font-bold font-display">Cardápio</h1>
            <p className="text-muted-foreground">
              Gerencie categorias e produtos
            </p>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos ({products.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Categorias ({categories.length})
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => openProductModal()} className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>

            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum produto cadastrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium truncate">{product.name}</h3>
                              <p className="text-lg font-bold text-primary">
                                R$ {Number(product.price).toFixed(2)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openProductModal(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleProductActive(product)}>
                                  {product.is_active ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleProductFeatured(product)}>
                                  <Star className={`h-4 w-4 mr-2 ${product.is_featured ? 'fill-current' : ''}`} />
                                  {product.is_featured ? 'Remover destaque' : 'Destacar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDeleteModal({
                                      open: true,
                                      type: 'product',
                                      id: product.id,
                                      name: product.name,
                                    })
                                  }
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {!product.is_active && (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                            {product.is_featured && (
                              <Badge className="bg-warning/10 text-warning border-warning/30">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Destaque
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCategoryModal()} className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>

            {categories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <Card key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <FolderOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {products.filter((p) => p.category_id === category.id).length} produtos
                          </Badge>
                          {!category.is_active && <Badge variant="secondary">Inativa</Badge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openCategoryModal(category)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleCategoryActive(category)}>
                                {category.is_active ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setDeleteModal({
                                    open: true,
                                    type: 'category',
                                    id: category.id,
                                    name: category.name,
                                  })
                                }
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Category Modal */}
      <Dialog
        open={categoryModal.open}
        onOpenChange={(open) => !open && setCategoryModal({ open: false, category: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryModal.category ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem</Label>
              <ImageUpload
                value={categoryForm.image_url}
                onChange={(url) => setCategoryForm({ ...categoryForm, image_url: url })}
                folder={user?.id || 'temp'}
                aspectRatio="video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nome *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Lanches, Bebidas..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryDesc">Descrição</Label>
              <Textarea
                id="categoryDesc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Descrição da categoria..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryModal({ open: false, category: null })}
            >
              Cancelar
            </Button>
            <Button onClick={saveCategory} disabled={savingCategory || !categoryForm.name.trim()}>
              {savingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog
        open={productModal.open}
        onOpenChange={(open) => !open && setProductModal({ open: false, product: null })}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {productModal.product ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem</Label>
              <ImageUpload
                value={productForm.image_url}
                onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                folder={user?.id || 'temp'}
                aspectRatio="square"
                className="max-w-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Nome *</Label>
              <Input
                id="productName"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Nome do produto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDesc">Descrição</Label>
              <Textarea
                id="productDesc"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Descrição do produto..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productPrice">Preço (R$) *</Label>
                <Input
                  id="productPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productTime">Tempo de preparo (min)</Label>
                <Input
                  id="productTime"
                  type="number"
                  min="1"
                  value={productForm.preparation_time_minutes}
                  onChange={(e) =>
                    setProductForm({ ...productForm, preparation_time_minutes: e.target.value })
                  }
                  placeholder="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={productForm.category_id}
                onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={productForm.is_featured}
                onCheckedChange={(checked) =>
                  setProductForm({ ...productForm, is_featured: checked })
                }
              />
              <Label>Produto em destaque</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductModal({ open: false, product: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveProduct}
              disabled={savingProduct || !productForm.name.trim() || !productForm.price}
            >
              {savingProduct && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteModal?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}