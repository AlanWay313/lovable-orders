import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface OrderPayload {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

export function useOrderNotifications() {
  const { user } = useAuth();
  const companyIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const setupRealtimeSubscription = async () => {
      // Get user's company
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!company) {
        console.log('No company found for user');
        return;
      }

      companyIdRef.current = company.id;
      console.log('Setting up realtime subscription for company:', company.id);

      // Subscribe to new orders
      const channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `company_id=eq.${company.id}`,
          },
          (payload) => {
            console.log('New order received:', payload);
            const newOrder = payload.new as OrderPayload;
            
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(console.error);
            }

            // Show toast notification
            toast.success(`Novo pedido de ${newOrder.customer_name}!`, {
              description: `Valor: R$ ${newOrder.total.toFixed(2)}`,
              duration: 10000,
              action: {
                label: 'Ver pedidos',
                onClick: () => {
                  window.location.href = '/dashboard/orders';
                },
              },
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `company_id=eq.${company.id}`,
          },
          (payload) => {
            console.log('Order updated:', payload);
            const updatedOrder = payload.new as OrderPayload;
            
            // Only notify for important status changes
            if (updatedOrder.status === 'cancelled') {
              toast.error(`Pedido cancelado`, {
                description: `Cliente: ${updatedOrder.customer_name}`,
                duration: 8000,
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      return () => {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      cleanup.then((unsubscribe) => unsubscribe?.());
    };
  }, [user]);
}
