import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionStatus {
  plan: string;
  orderLimit: number;
  monthlyOrderCount: number;
  displayName: string;
  subscriptionEnd?: string;
  usagePercentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

export function useSubscriptionStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get company data
      const { data: company } = await supabase
        .from('companies')
        .select('monthly_order_count, subscription_status, subscription_plan, subscription_end_date')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!company) {
        setLoading(false);
        return;
      }

      // Get subscription details from edge function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const subscriptionData = response.data || { 
        plan: 'free', 
        orderLimit: 1000, 
        displayName: 'Plano Gratuito' 
      };

      const monthlyOrderCount = company.monthly_order_count || 0;
      const orderLimit = subscriptionData.orderLimit || 1000;
      const usagePercentage = orderLimit === -1 ? 0 : (monthlyOrderCount / orderLimit) * 100;

      setStatus({
        plan: subscriptionData.plan || 'free',
        orderLimit,
        monthlyOrderCount,
        displayName: subscriptionData.displayName || 'Plano Gratuito',
        subscriptionEnd: subscriptionData.subscriptionEnd,
        usagePercentage,
        isNearLimit: orderLimit !== -1 && usagePercentage >= 80 && usagePercentage < 100,
        isAtLimit: orderLimit !== -1 && usagePercentage >= 100,
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
