import { supabase } from '@/integrations/supabase/client';

// VAPID public key - this should match the one in the edge function
const VAPID_PUBLIC_KEY = 'BLBz-YrPq8gKXGE7RQrHqQnkzxoSbxHBVQZVT0J8VpKsVn6VqJ9XvKzxNnW9cXYFQqZ9hKRXMJV0FoqWQhYNpHc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('This browser does not support service workers');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(options: {
  orderId?: string;
  companyId?: string;
  userId?: string;
  userType: 'customer' | 'driver' | 'store_owner';
}): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return false;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const subscriptionJson = subscription.toJSON();

    // Save subscription to database
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
        user_id: options.userId || null,
        user_type: options.userType,
        company_id: options.companyId || null,
        order_id: options.orderId || null,
      },
      {
        onConflict: 'endpoint',
      }
    );

    if (error) {
      console.error('Error saving push subscription:', error);
      return false;
    }

    console.log('Push subscription saved successfully');
    return true;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      // Unsubscribe
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermission | null> {
  if (!('Notification' in window)) {
    return null;
  }
  return Notification.permission;
}
