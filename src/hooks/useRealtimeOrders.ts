import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeOrdersOptions {
  companyId: string | null;
  onOrderInsert?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
  onOrderDelete?: (orderId: string) => void;
  playSound?: boolean;
}

export function useRealtimeOrders({
  companyId,
  onOrderInsert,
  onOrderUpdate,
  onOrderDelete,
  playSound = true,
}: RealtimeOrdersOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (playSound && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [playSound]);

  useEffect(() => {
    if (!companyId) return;

    console.log('Setting up realtime subscription for company:', companyId);

    const channel = supabase
      .channel(`orders-realtime-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('New order received:', payload);
          playNotificationSound();
          
          toast.success(`Novo pedido de ${payload.new.customer_name}!`, {
            description: `Valor: R$ ${Number(payload.new.total).toFixed(2)}`,
            duration: 10000,
          });
          
          onOrderInsert?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          onOrderUpdate?.(payload.new);
          
          // Notify on specific status changes
          if (payload.new.status === 'cancelled' && payload.old?.status !== 'cancelled') {
            toast.error(`Pedido cancelado`, {
              description: `Cliente: ${payload.new.customer_name}`,
              duration: 8000,
            });
          }
          
          if (payload.new.status === 'delivered' && payload.old?.status !== 'delivered') {
            toast.success(`Pedido entregue!`, {
              description: `Cliente: ${payload.new.customer_name}`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Order deleted:', payload);
          onOrderDelete?.(payload.old.id);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [companyId, onOrderInsert, onOrderUpdate, onOrderDelete, playNotificationSound]);
}
