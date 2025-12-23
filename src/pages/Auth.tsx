import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Check user role and redirect accordingly
      const isDriver = hasRole('delivery_driver');
      const isStoreOwner = hasRole('store_owner');
      const isSuperAdmin = hasRole('super_admin');
      
      // If user is ONLY a driver (not store owner or admin), redirect to driver area
      if (isDriver && !isStoreOwner && !isSuperAdmin) {
        navigate('/driver');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, hasRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 shadow-glow">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === 'login'
                ? 'Entre para gerenciar seu cardápio'
                : 'Comece a vender online hoje'}
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
            <AuthForm mode={mode} onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')} />
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-lg animate-slide-up">
          <h2 className="text-4xl font-bold font-display mb-6">
            Cardápio Digital para seu Negócio
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Gerencie pedidos, configure entregas e acompanhe suas vendas em tempo real. Tudo em um só lugar.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-white/80">Empresas</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">10k+</div>
              <div className="text-sm text-white/80">Pedidos</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">98%</div>
              <div className="text-sm text-white/80">Satisfação</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}