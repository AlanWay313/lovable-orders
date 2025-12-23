import { useState } from 'react';
import { Minus, Plus, X, Trash2, ArrowLeft, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCart } from '@/hooks/useCart';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ProductOption {
  id: string;
  name: string;
  price_modifier: number;
  is_required: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  product_options?: ProductOption[];
}

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductModal({ product, open, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<{ name: string; priceModifier: number }[]>([]);

  if (!product) return null;

  const handleOptionToggle = (option: ProductOption, checked: boolean) => {
    if (checked) {
      setSelectedOptions((prev) => [
        ...prev,
        { name: option.name, priceModifier: option.price_modifier },
      ]);
    } else {
      setSelectedOptions((prev) => prev.filter((o) => o.name !== option.name));
    }
  };

  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0);
  const itemTotal = (product.price + optionsTotal) * quantity;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      options: selectedOptions,
      notes: notes || undefined,
      imageUrl: product.image_url || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setNotes('');
    setSelectedOptions([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
        </DialogHeader>

        {product.image_url && (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {product.description && (
          <p className="text-muted-foreground text-sm">{product.description}</p>
        )}

        <div className="text-2xl font-bold font-display text-primary">
          R$ {product.price.toFixed(2)}
        </div>

        {/* Options */}
        {product.product_options && product.product_options.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Adicionais</h4>
            {product.product_options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={option.id}
                    checked={selectedOptions.some(o => o.name === option.name)}
                    onCheckedChange={(checked) =>
                      handleOptionToggle(option, checked as boolean)
                    }
                  />
                  <Label htmlFor={option.id} className="cursor-pointer">
                    {option.name}
                    {option.is_required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                </div>
                {option.price_modifier > 0 && (
                  <span className="text-sm font-medium text-primary">
                    +R$ {option.price_modifier.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            placeholder="Ex: Sem cebola, bem passado..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Quantity & Add to Cart */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3 bg-secondary rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-medium w-8 text-center">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            className="flex-1 gradient-primary text-primary-foreground"
            onClick={handleAddToCart}
          >
            Adicionar R$ {itemTotal.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Suggested Products (Beverages)
interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface SuggestedProductsProps {
  products: SuggestedProduct[];
  onAdd: (product: SuggestedProduct) => void;
}

export function SuggestedProducts({ products, onAdd }: SuggestedProductsProps) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Coffee className="h-4 w-4" />
        <span>Sugestões para você</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onAdd(product)}
            className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all bg-card min-w-[100px]"
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Coffee className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <span className="text-xs font-medium text-center line-clamp-2">{product.name}</span>
            <span className="text-xs text-primary font-bold">+R$ {product.price.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Cart Drawer Component
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
  deliveryFee: number;
  suggestedProducts?: SuggestedProduct[];
  isStoreOpen: boolean;
}

export function CartDrawer({ 
  open, 
  onClose, 
  onCheckout, 
  onContinueShopping,
  deliveryFee, 
  suggestedProducts = [],
  isStoreOpen 
}: CartDrawerProps) {
  const { items, removeItem, updateQuantity, subtotal, clearCart, addItem } = useCart();

  const total = subtotal + deliveryFee;

  const handleAddSuggested = (product: SuggestedProduct) => {
    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      options: [],
      imageUrl: product.image_url || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between">
            Seu Pedido
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={clearCart}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBagIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
            <p className="text-sm text-muted-foreground">Adicione itens do cardápio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-lg border border-border"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.productName}</h4>
                    {item.options.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.options.map((o) => o.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {item.notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-medium">
                        R$ {((item.price + item.options.reduce((s, o) => s + o.priceModifier, 0)) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Suggested Products */}
              {suggestedProducts.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <SuggestedProducts 
                    products={suggestedProducts} 
                    onAdd={handleAddSuggested} 
                  />
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>R$ {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>

              {!isStoreOpen && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center">
                  A loja está fechada no momento. Você pode adicionar itens, mas não finalizar o pedido.
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onContinueShopping}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continuar comprando
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground"
                  onClick={onCheckout}
                  disabled={!isStoreOpen}
                >
                  Finalizar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
