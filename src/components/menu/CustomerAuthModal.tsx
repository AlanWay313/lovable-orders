import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Phone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

const phoneSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido').max(15, 'Telefone inválido'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;

export interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string;
}

interface CustomerAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (customer: CustomerData) => void;
}

type Method = 'email' | 'phone';

export function CustomerAuthModal({ open, onClose, onSuccess }: CustomerAuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<Method>('email');

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const resetState = () => {
    emailForm.reset();
    phoneForm.reset();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleEmailLogin = async (data: EmailFormData) => {
    setLoading(true);
    try {
      // Use secure Edge Function for customer lookup
      const { data: result, error } = await supabase.functions.invoke('lookup-customer', {
        body: { email: data.email.toLowerCase().trim() }
      });

      if (error) throw error;

      if (result?.found && result?.customerId) {
        // Fetch full customer data using the secure customer ID
        const { data: customer, error: fetchError } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('id', result.customerId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (customer) {
          toast.success(`Bem-vindo de volta, ${result.firstName}!`);
          onSuccess(customer);
          handleClose();
        }
      } else {
        toast.error('Email não encontrado. Faça seu primeiro pedido para se cadastrar.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('429') || error.status === 429) {
        toast.error('Muitas tentativas. Aguarde um minuto e tente novamente.');
      } else {
        toast.error('Erro ao verificar email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (data: PhoneFormData) => {
    setLoading(true);
    try {
      const cleanPhone = data.phone.replace(/\D/g, '');
      
      // Use secure Edge Function for customer lookup
      const { data: result, error } = await supabase.functions.invoke('lookup-customer', {
        body: { phone: cleanPhone }
      });

      if (error) throw error;

      if (result?.found && result?.customerId) {
        // Fetch full customer data using the secure customer ID
        const { data: customer, error: fetchError } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('id', result.customerId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (customer) {
          toast.success(`Bem-vindo de volta, ${result.firstName}!`);
          onSuccess(customer);
          handleClose();
        }
      } else {
        toast.error('Telefone não encontrado. Faça seu primeiro pedido para se cadastrar.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('429') || error.status === 429) {
        toast.error('Muitas tentativas. Aguarde um minuto e tente novamente.');
      } else {
        toast.error('Erro ao verificar telefone');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Acessar minha conta</DialogTitle>
        </DialogHeader>

        <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone">
              <Phone className="h-4 w-4 mr-2" />
              Telefone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...emailForm.register('email')}
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="phone" className="mt-4">
            <form onSubmit={phoneForm.handleSubmit(handlePhoneLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                    {...phoneForm.register('phone')}
                  />
                </div>
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          Use o mesmo email ou telefone do seu primeiro pedido para acessar seus endereços salvos.
        </p>
      </DialogContent>
    </Dialog>
  );
}
