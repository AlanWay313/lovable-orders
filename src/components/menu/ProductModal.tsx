import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ProductOption {
  id: string;
  name: string;
  description?: string | null;
  price_modifier: number;
  is_required: boolean;
  is_available?: boolean;
  sort_order?: number;
  group_id?: string | null;
}

interface OptionGroup {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  selection_type: string;
  sort_order: number;
  options: ProductOption[];
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

interface SelectedOption {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  priceModifier: number;
}

export function ProductModal({ product, open, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadOptionGroups();
    }
  }, [open, product?.id]);

  const loadOptionGroups = async () => {
    if (!product) return;

    setLoading(true);
    try {
      // Load option groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order');

      if (groupsError) throw groupsError;

      // Load options
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_available', true)
        .order('sort_order');

      if (optionsError) throw optionsError;

      // Group options
      const groups: OptionGroup[] = (groupsData || []).map((group) => ({
        ...group,
        options: (optionsData || []).filter((opt) => opt.group_id === group.id),
      }));

      // Add ungrouped options (legacy)
      const ungroupedOptions = (optionsData || []).filter((opt) => !opt.group_id);
      if (ungroupedOptions.length > 0) {
        groups.push({
          id: 'ungrouped',
          name: 'Adicionais',
          description: null,
          is_required: false,
          min_selections: 0,
          max_selections: ungroupedOptions.length,
          selection_type: 'multiple',
          sort_order: 999,
          options: ungroupedOptions,
        });
      }

      setOptionGroups(groups);
    } catch (error) {
      console.error('Error loading options:', error);
      // Fallback to legacy options from product prop
      if (product.product_options && product.product_options.length > 0) {
        setOptionGroups([{
          id: 'legacy',
          name: 'Adicionais',
          description: null,
          is_required: false,
          min_selections: 0,
          max_selections: product.product_options.length,
          selection_type: 'multiple',
          sort_order: 0,
          options: product.product_options.map(opt => ({
            ...opt,
            description: null,
            is_available: true,
            sort_order: 0,
            group_id: 'legacy',
          })),
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const handleSingleSelect = (group: OptionGroup, option: ProductOption) => {
    // Remove any existing selection from this group
    const filtered = selectedOptions.filter((o) => o.groupId !== group.id);
    // Add new selection
    setSelectedOptions([
      ...filtered,
      {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        name: option.name,
        priceModifier: option.price_modifier,
      },
    ]);
  };

  const handleMultipleToggle = (group: OptionGroup, option: ProductOption, checked: boolean) => {
    if (checked) {
      // Check max selections
      const currentCount = selectedOptions.filter((o) => o.groupId === group.id).length;
      if (currentCount >= group.max_selections) {
        return; // Max reached
      }
      setSelectedOptions([
        ...selectedOptions,
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          name: option.name,
          priceModifier: option.price_modifier,
        },
      ]);
    } else {
      setSelectedOptions(selectedOptions.filter((o) => o.optionId !== option.id));
    }
  };

  const handleHalfHalfToggle = (group: OptionGroup, option: ProductOption, checked: boolean) => {
    // Half-half allows exactly 2 selections
    if (checked) {
      const currentCount = selectedOptions.filter((o) => o.groupId === group.id).length;
      if (currentCount >= 2) {
        // Remove oldest and add new
        const filtered = selectedOptions.filter((o) => o.groupId !== group.id);
        const existing = selectedOptions.filter((o) => o.groupId === group.id);
        setSelectedOptions([
          ...filtered,
          existing[1], // Keep second selection
          {
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            name: option.name,
            priceModifier: option.price_modifier / 2, // Half price for half-half
          },
        ]);
      } else {
        setSelectedOptions([
          ...selectedOptions,
          {
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            name: option.name,
            priceModifier: option.price_modifier / 2, // Half price
          },
        ]);
      }
    } else {
      setSelectedOptions(selectedOptions.filter((o) => o.optionId !== option.id));
    }
  };

  const isOptionSelected = (optionId: string) => {
    return selectedOptions.some((o) => o.optionId === optionId);
  };

  const getGroupSelectionCount = (groupId: string) => {
    return selectedOptions.filter((o) => o.groupId === groupId).length;
  };

  const validateRequiredGroups = () => {
    for (const group of optionGroups) {
      if (group.is_required) {
        const count = getGroupSelectionCount(group.id);
        if (count < (group.min_selections || 1)) {
          return false;
        }
      }
    }
    return true;
  };

  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0);
  const itemTotal = (product.price + optionsTotal) * quantity;

  const handleAddToCart = () => {
    if (!validateRequiredGroups()) {
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      options: selectedOptions.map((o) => ({
        name: o.name,
        priceModifier: o.priceModifier,
      })),
      notes: notes || undefined,
      imageUrl: product.image_url || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setNotes('');
    setSelectedOptions([]);
    setOptionGroups([]);
    onClose();
  };

  const canAddToCart = validateRequiredGroups();

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

        {/* Option Groups */}
        {optionGroups.length > 0 && (
          <div className="space-y-6">
            {optionGroups.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{group.name}</h4>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {group.is_required && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                    {group.selection_type === 'multiple' && group.max_selections > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {getGroupSelectionCount(group.id)}/{group.max_selections}
                      </Badge>
                    )}
                    {group.selection_type === 'half_half' && (
                      <Badge variant="outline" className="text-xs">
                        Meio a meio ({getGroupSelectionCount(group.id)}/2)
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Single Selection (Radio) */}
                {group.selection_type === 'single' && (
                  <RadioGroup
                    value={selectedOptions.find((o) => o.groupId === group.id)?.optionId || ''}
                    onValueChange={(value) => {
                      const option = group.options.find((o) => o.id === value);
                      if (option) handleSingleSelect(group, option);
                    }}
                  >
                    {group.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="cursor-pointer flex-1">
                            <span>{option.name}</span>
                            {option.description && (
                              <span className="block text-xs text-muted-foreground">{option.description}</span>
                            )}
                          </Label>
                        </div>
                        {option.price_modifier !== 0 && (
                          <span className={`text-sm font-medium ${option.price_modifier > 0 ? 'text-primary' : 'text-success'}`}>
                            {option.price_modifier > 0 ? '+' : ''}R$ {option.price_modifier.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Multiple Selection (Checkbox) */}
                {(group.selection_type === 'multiple' || group.selection_type === 'half_half') && (
                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const isSelected = isOptionSelected(option.id);
                      const currentCount = getGroupSelectionCount(group.id);
                      const maxReached = group.selection_type === 'multiple' 
                        ? currentCount >= group.max_selections && !isSelected
                        : currentCount >= 2 && !isSelected;

                      const handleToggle = () => {
                        if (maxReached && !isSelected) return;
                        if (group.selection_type === 'half_half') {
                          handleHalfHalfToggle(group, option, !isSelected);
                        } else {
                          handleMultipleToggle(group, option, !isSelected);
                        }
                      };

                      return (
                        <button
                          type="button"
                          key={option.id}
                          onClick={handleToggle}
                          disabled={maxReached && !isSelected}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/10 shadow-sm' 
                              : 'border-border hover:border-primary/30 hover:bg-muted/50'
                          } ${maxReached && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected 
                                ? 'bg-primary border-primary' 
                                : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && (
                                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="text-left">
                              <span className="font-medium">{option.name}</span>
                              {option.description && (
                                <span className="block text-xs text-muted-foreground">{option.description}</span>
                              )}
                            </div>
                          </div>
                          {option.price_modifier !== 0 && (
                            <span className={`text-sm font-semibold ${option.price_modifier > 0 ? 'text-primary' : 'text-green-600'}`}>
                              {option.price_modifier > 0 ? '+' : ''}R$ {
                                group.selection_type === 'half_half' 
                                  ? (option.price_modifier / 2).toFixed(2) 
                                  : option.price_modifier.toFixed(2)
                              }
                              {group.selection_type === 'half_half' && ' (½)'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
            disabled={!canAddToCart}
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
