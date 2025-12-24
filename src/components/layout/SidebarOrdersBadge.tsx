import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export function SidebarOrdersBadge() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const companyIdRef = useRef<string | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.6;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const fetchPendingCount = useCallback(async (companyId: string) => {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['pending', 'confirmed']);

    if (!error && count !== null) {
      setPendingCount(count);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const setupSubscription = async () => {
      // Get company ID
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!companyData?.id) return;
      
      companyIdRef.current = companyData.id;
      await fetchPendingCount(companyData.id);

      // Subscribe to order changes
      const channel = supabase
        .channel(`sidebar-orders-${companyData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `company_id=eq.${companyData.id}`,
          },
          () => {
            playSound();
            setHasNewOrder(true);
            fetchPendingCount(companyData.id);
            
            // Reset animation after 3 seconds
            setTimeout(() => setHasNewOrder(false), 3000);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `company_id=eq.${companyData.id}`,
          },
          () => {
            fetchPendingCount(companyData.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [user?.id, fetchPendingCount, playSound]);

  if (pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <Bell 
        className={`h-4 w-4 ${hasNewOrder ? 'text-yellow-400 animate-bounce' : 'text-muted-foreground'}`} 
      />
      <Badge 
        variant="destructive" 
        className={`h-5 min-w-5 px-1 text-xs flex items-center justify-center ${hasNewOrder ? 'animate-pulse' : ''}`}
      >
        {pendingCount}
      </Badge>
    </div>
  );
}
