import { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Home, Building, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Address {
  id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference: string | null;
  label: string | null;
  is_default: boolean | null;
  customer_id?: string | null;
}

interface AddressSelectorProps {
  customerId: string;
  selectedAddressId: string | null;
  onSelect: (address: Address | null) => void;
  onAddNew: () => void;
}

export function AddressSelector({ customerId, selectedAddressId, onSelect, onAddNew }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      loadAddresses();
    } else {
      setAddresses([]);
      setLoading(false);
    }
  }, [customerId]);

  const loadAddresses = async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      // Get addresses directly by customer_id
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);

      // Auto-select default or first address
      if (data && data.length > 0 && !selectedAddressId) {
        const defaultAddr = data.find(a => a.is_default) || data[0];
        onSelect(defaultAddr);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLabelIcon = (label: string | null) => {
    switch (label?.toLowerCase()) {
      case 'trabalho':
        return <Briefcase className="h-4 w-4" />;
      case 'apartamento':
        return <Building className="h-4 w-4" />;
      default:
        return <Home className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <MapPin className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Nenhum endereço cadastrado</p>
          <p className="text-xs text-muted-foreground">Adicione um endereço para continuar</p>
        </div>
        <Button onClick={onAddNew} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Endereço
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedAddressId || ''}
        onValueChange={(value) => {
          const addr = addresses.find(a => a.id === value);
          onSelect(addr || null);
        }}
        className="space-y-3"
      >
        {addresses.map((address) => (
          <Label
            key={address.id}
            htmlFor={address.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
              selectedAddressId === address.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
          >
            <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getLabelIcon(address.label)}
                <span className="font-medium">{address.label || 'Casa'}</span>
                {address.is_default && (
                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                )}
              </div>
              <p className="text-sm">
                {address.street}, {address.number}
                {address.complement && ` - ${address.complement}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {address.neighborhood} - {address.city}/{address.state}
              </p>
              {address.reference && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ref: {address.reference}
                </p>
              )}
            </div>
            {selectedAddressId === address.id && (
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
            )}
          </Label>
        ))}
      </RadioGroup>

      <Button onClick={onAddNew} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Novo Endereço
      </Button>
    </div>
  );
}
