import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, User, Eye, EyeOff, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthFormProps {
  mode: 'login' | 'signup';
  onToggleMode: () => void;
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === 'login';
  const schema = isLogin ? loginSchema : signupSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormData>({
    resolver: zodResolver(schema),
  });

  const linkDriverAccount = async (userId: string, email: string) => {
    try {
      // Check if there's a driver with this email that hasn't been linked yet
      const { data: driver, error: driverError } = await supabase
        .from('delivery_drivers')
        .select('id')
        .eq('email', email.toLowerCase())
        .is('user_id', null)
        .maybeSingle();

      if (driverError) {
        console.error('Error checking driver:', driverError);
        return;
      }

      if (driver) {
        // Link the driver to this user
        await supabase
          .from('delivery_drivers')
          .update({ user_id: userId })
          .eq('id', driver.id);

        // Add driver role
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'delivery_driver' })
          .select()
          .maybeSingle();

        console.log('Driver account linked successfully');
      }
    } catch (error) {
      console.error('Error linking driver account:', error);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Erro no login',
              description: 'Email ou senha incorretos',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro no login',
              description: error.message,
              variant: 'destructive',
            });
          }
          return;
        }
        
        // After successful login, check and link driver account
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          await linkDriverAccount(loggedUser.id, data.email);
          
          // Check if user is a driver and redirect accordingly
          const { data: driverCheck } = await supabase
            .from('delivery_drivers')
            .select('id')
            .eq('user_id', loggedUser.id)
            .eq('is_active', true)
            .maybeSingle();

          if (driverCheck) {
            toast({
              title: 'Bem-vindo, entregador!',
              description: 'Você será redirecionado para suas entregas',
            });
            navigate('/driver');
            return;
          }
        }
        
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso',
        });
        navigate('/');
      } else {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: 'Email já cadastrado',
              description: 'Este email já está em uso. Tente fazer login.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro no cadastro',
              description: error.message,
              variant: 'destructive',
            });
          }
          return;
        }
        
        // Get the new user
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          // Check if user was linked as a driver first
          const { data: driverCheck } = await supabase
            .from('delivery_drivers')
            .select('id')
            .eq('user_id', newUser.id)
            .eq('is_active', true)
            .maybeSingle();

          if (driverCheck) {
            toast({
              title: 'Conta criada!',
              description: 'Você foi vinculado como entregador',
            });
            navigate('/driver');
            return;
          }

          // Generate a unique slug for the company
          const baseSlug = data.companyName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

          // Create company for the new user
          const { error: companyError } = await supabase
            .from('companies')
            .insert({
              name: data.companyName,
              slug: uniqueSlug,
              owner_id: newUser.id,
              status: 'approved', // Auto-approve new companies
            });

          if (companyError) {
            console.error('Error creating company:', companyError);
            toast({
              title: 'Erro ao criar empresa',
              description: 'Sua conta foi criada, mas houve um erro ao criar a empresa. Entre em contato com o suporte.',
              variant: 'destructive',
            });
            return;
          }

          // Add store_owner role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: newUser.id,
              role: 'store_owner',
            });

          if (roleError) {
            console.error('Error adding store_owner role:', roleError);
          }
        }
        
        toast({
          title: 'Conta criada!',
          description: 'Sua empresa foi criada com sucesso. Configure seu cardápio!',
        });
        navigate('/dashboard');
      }
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!isLogin && (
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-foreground">
            Nome da Empresa
          </Label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="companyName"
              type="text"
              placeholder="Nome do seu negócio"
              className="pl-10"
              {...register('companyName')}
            />
          </div>
          {errors.companyName && (
            <p className="text-sm text-destructive">{errors.companyName.message}</p>
          )}
        </div>
      )}

      {!isLogin && (
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-foreground">
            Seu Nome
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              placeholder="Seu nome completo"
              className="pl-10"
              {...register('fullName')}
            />
          </div>
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className="pl-10"
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground">
          Senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="pl-10 pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {!isLogin && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-foreground">
            Confirmar senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10"
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {isLogin ? 'Entrar' : 'Criar conta'}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {isLogin
            ? 'Não tem uma conta? Cadastre-se'
            : 'Já tem uma conta? Faça login'}
        </button>
      </div>
    </form>
  );
}