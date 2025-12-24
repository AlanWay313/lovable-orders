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
      // Get fresh session first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.log('No valid session for subscription check');
        setLoading(false);
        return;
      }

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
      const response = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      // Handle edge function errors gracefully
      if (response.error) {
        console.log('Subscription check returned error, using defaults:', response.error);
        // Use local data as fallback
        const monthlyOrderCount = company.monthly_order_count || 0;
        const orderLimit = company.subscription_plan === 'basic' ? 2000 
          : company.subscription_plan === 'pro' ? 5000 
          : company.subscription_plan === 'enterprise' ? -1 
          : 1000;
        const usagePercentage = orderLimit === -1 ? 0 : (monthlyOrderCount / orderLimit) * 100;
        
        setStatus({
          plan: company.subscription_plan || 'free',
          orderLimit,
          monthlyOrderCount,
          displayName: company.subscription_plan === 'basic' ? 'Plano Básico'
            : company.subscription_plan === 'pro' ? 'Plano Pro'
            : company.subscription_plan === 'enterprise' ? 'Plano Enterprise'
            : 'Plano Gratuito',
          subscriptionEnd: company.subscription_end_date || undefined,
          usagePercentage,
          isNearLimit: orderLimit !== -1 && usagePercentage >= 80 && usagePercentage < 100,
          isAtLimit: orderLimit !== -1 && usagePercentage >= 100,
        });
        setLoading(false);
        return;
      }

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
