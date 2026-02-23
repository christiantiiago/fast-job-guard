import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.error('Falha ao registrar service worker:', error);
    return null;
  }
};

export const syncPushSubscription = async (userId: string) => {
  if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return;
  }

  const currentSubscription = await registration.pushManager.getSubscription();
  const subscription =
    currentSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const subscriptionJson = subscription.toJSON();
  const keys = subscriptionJson.keys;

  if (!subscription.endpoint || !keys?.auth || !keys?.p256dh) {
    console.warn('Subscription inválida para Web Push');
    return;
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    throw error;
  }
};

export const unsubscribePushNotifications = async (userId: string) => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint);
  }
};

export const requestPushPermissionAndSync = async (userId: string) => {
  if (!('Notification' in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return false;
  }

  await syncPushSubscription(userId);
  return true;
};
