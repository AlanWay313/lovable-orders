import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface SendPushRequest {
  orderId?: string;
  companyId?: string;
  userId?: string;
  userType?: 'customer' | 'driver' | 'store_owner';
  payload: PushPayload;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Import web-push dynamically
    const webPush = await import("npm:web-push@3.6.7");

    webPush.default.setVapidDetails(
      'mailto:contato@cardpon.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webPush.default.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    console.log('Push notification sent successfully to:', subscription.endpoint);
    return true;
  } catch (error: unknown) {
    console.error('Error sending push notification:', error);
    
    // If subscription is no longer valid, we should delete it
    const err = error as { statusCode?: number };
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('Subscription is no longer valid, should be deleted');
    }
    
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendPushRequest = await req.json();
    const { orderId, companyId, userId, userType, payload } = body;

    console.log('Sending push notification:', { orderId, companyId, userId, userType, payload });

    // Build query to find subscriptions
    let query = supabase.from('push_subscriptions').select('*');

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (companyId && userType) {
      query = query.eq('company_id', companyId).eq('user_type', userType);
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Send push to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const success = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );

        // Delete invalid subscriptions
        if (!success) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }

        return success;
      })
    );

    const sentCount = results.filter(Boolean).length;

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const err = error as { message?: string };
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
