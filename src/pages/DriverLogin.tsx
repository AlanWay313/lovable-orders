import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Truck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function DriverLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole, signOut } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      const isDriver = hasRole('delivery_driver');
      const isStoreOwner = hasRole('store_owner');
      const isSuperAdmin = hasRole('super_admin');
      
      // If user is a driver, redirect to driver dashboard
      if (isDriver) {
        navigate('/driver', { replace: true });
        return;
      }
      
      // If user is store owner or admin (not a driver), sign them out first
      // to avoid session conflicts
      if (isStoreOwner || isSuperAdmin) {
        // Show message and sign out
        toast.info('Você está logado como lojista', {
          description: 'Faça logout para acessar como entregador',
        });
        signOut();
      }
    }
  }, [user, authLoading, hasRole, navigate, signOut]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Digite seu email');
      return;
    }

    setLoading(true);

    try {
      // Use edge function to validate driver email (bypasses RLS)
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        'validate-driver-email',
        { body: { email: email.toLowerCase().trim() } }
      );

      if (validationError) throw validationError;

      if (!validationData.valid) {
        toast.error('Email não encontrado', {
          description: 'Este email não está cadastrado como entregador.',
        });
        setLoading(false);
        return;
      }

      if (!validationData.isActive) {
        toast.error('Conta desativada', {
          description: 'Sua conta de entregador está desativada. Entre em contato com o estabelecimento.',
        });
        setLoading(false);
        return;
      }

      // Send OTP and custom email via edge function
      const { data: otpData, error: otpError } = await supabase.functions.invoke(
        'send-driver-otp',
        { body: { email: email.toLowerCase().trim() } }
      );

      if (otpError) throw otpError;

      toast.success('Código enviado!', {
        description: `Verifique sua caixa de entrada em ${email}`,
      });
      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error('Erro ao enviar código', {
        description: error.message || 'Tente novamente',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      if (data.session) {
        toast.success('Login realizado com sucesso!');
        navigate('/driver');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error('Código inválido', {
        description: 'Verifique o código e tente novamente',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      // Resend OTP via edge function
      const { error } = await supabase.functions.invoke(
        'send-driver-otp',
        { body: { email: email.toLowerCase().trim() } }
      );

      if (error) throw error;

      toast.success('Código reenviado!', {
        description: 'Verifique sua caixa de entrada',
      });
      setOtp('');
    } catch (error: any) {
      toast.error('Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Área do Entregador</CardTitle>
          <CardDescription>
            {step === 'email' 
              ? 'Acesse com o email cadastrado pelo estabelecimento'
              : `Digite o código enviado para ${email}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full gradient-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Enviar código de acesso
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  📧 Verifique sua <strong>caixa de entrada</strong> e também a pasta de <strong>spam/lixo eletrônico</strong>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
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

              <Button 
                onClick={handleVerifyOTP}
                className="w-full gradient-primary text-primary-foreground"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>
                
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={loading}
                >
                  Reenviar código
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
