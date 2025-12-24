import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeDriverOrdersOptions {
  driverId: string | null;
  onOrderAssigned?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
  playSound?: boolean;
}

export function useRealtimeDriverOrders({
  driverId,
  onOrderAssigned,
  onOrderUpdate,
  playSound = true,
}: RealtimeDriverOrdersOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.7;

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
    if (!driverId) return;

    console.log('Setting up realtime subscription for driver:', driverId);

    const channel = supabase
      .channel(`driver-orders-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `delivery_driver_id=eq.${driverId}`,
        },
        (payload) => {
          console.log('Driver order update:', payload);
          
          // Check if this is a new assignment
          if (payload.old?.delivery_driver_id !== driverId && payload.new.delivery_driver_id === driverId) {
            playNotificationSound();
            toast.success('Nova entrega atribuída!', {
              description: `Pedido #${payload.new.id.slice(0, 8)} - ${payload.new.customer_name}`,
              duration: 10000,
            });
            onOrderAssigned?.(payload.new);
          } else {
            onOrderUpdate?.(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('Driver realtime subscription status:', status);
      });

    // Also listen to INSERT events in case order is created with driver already assigned
    const insertChannel = supabase
      .channel(`driver-orders-insert-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `delivery_driver_id=eq.${driverId}`,
        },
        (payload) => {
          console.log('New order assigned to driver:', payload);
          playNotificationSound();
          toast.success('Nova entrega atribuída!', {
            description: `Pedido #${payload.new.id.slice(0, 8)} - ${payload.new.customer_name}`,
            duration: 10000,
          });
          onOrderAssigned?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(insertChannel);
    };
  }, [driverId, onOrderAssigned, onOrderUpdate, playNotificationSound]);
}
