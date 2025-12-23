import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Phone, Mail, ArrowLeft } from 'lucide-react';
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
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

interface CustomerAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'input' | 'verify';
type Method = 'email' | 'phone';

export function CustomerAuthModal({ open, onClose, onSuccess }: CustomerAuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [method, setMethod] = useState<Method>('email');
  const [otpValue, setOtpValue] = useState('');
  const [sentTo, setSentTo] = useState('');

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const resetState = () => {
    setStep('input');
    setOtpValue('');
    setSentTo('');
    emailForm.reset();
    phoneForm.reset();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const formatPhone = (phone: string) => {
    // Format to E.164: +55XXXXXXXXXXX
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) {
      return `+${digits}`;
    }
    return `+55${digits}`;
  };

  const handleSendEmailOTP = async (data: EmailFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSentTo(data.email);
      setStep('verify');
      toast.success('Código enviado para seu email!');
    } catch (error: any) {
      toast.error('Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOTP = async (data: PhoneFormData) => {
    setLoading(true);
    try {
      const formattedPhone = formatPhone(data.phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        if (error.message.includes('Phone logins are disabled')) {
          toast.error('Login por telefone não está habilitado. Use o email.');
          setMethod('email');
        } else {
          toast.error(error.message);
        }
        return;
      }

      setSentTo(formattedPhone);
      setStep('verify');
      toast.success('Código enviado para seu telefone!');
    } catch (error: any) {
      toast.error('Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const verifyOptions = method === 'email' 
        ? { email: sentTo, token: otpValue, type: 'email' as const }
        : { phone: sentTo, token: otpValue, type: 'sms' as const };

      const { error } = await supabase.auth.verifyOtp(verifyOptions);

      if (error) {
        toast.error('Código inválido ou expirado');
        return;
      }

      toast.success('Login realizado com sucesso!');
      resetState();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (method === 'email') {
      await handleSendEmailOTP({ email: sentTo });
    } else {
      await handleSendPhoneOTP({ phone: sentTo });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'input' ? 'Entrar na sua conta' : 'Digite o código'}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' ? (
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
              <form onSubmit={emailForm.handleSubmit(handleSendEmailOTP)} className="space-y-4">
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
                  Enviar código
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone" className="mt-4">
              <form onSubmit={phoneForm.handleSubmit(handleSendPhoneOTP)} className="space-y-4">
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
                  Enviar código
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <div className="text-center text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para{' '}
              <span className="font-medium text-foreground">{sentTo}</span>
            </div>

            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                value={otpValue} 
                onChange={setOtpValue}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleVerifyOTP} 
                className="w-full" 
                disabled={loading || otpValue.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar código
              </Button>

              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setStep('input')}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Reenviar código
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Usamos apenas para acompanhar seus pedidos e endereços salvos.
        </p>
      </DialogContent>
    </Dialog>
  );
}
