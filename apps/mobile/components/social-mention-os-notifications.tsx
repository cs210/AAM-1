import { api } from '@packages/backend/convex/_generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'social-mentions';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Friends & mentions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 110, 220],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function resolveEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function openMentionFromData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined | null
) {
  if (!data || data.kind !== 'mention_in_checkin') return;
  const museumId = typeof data.museumId === 'string' ? data.museumId : '';
  const checkInId = typeof data.checkInId === 'string' ? data.checkInId : '';
  if (!checkInId) return;
  if (museumId) {
    const href =
      `/(museums)/${museumId}?highlight=${encodeURIComponent(checkInId)}&tab=reviews` as Href;
    router.push(href);
  } else {
    router.push('/notifications');
  }
}

/**
 * Registers this device for Expo remote push (mentions while app is closed), configures
 * Android channels / foreground presentation, and handles notification taps.
 */
export function SocialMentionOsNotifications() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const registerToken = useMutation(api.pushNotifications.registerExpoPushToken);
  const removeToken = useMutation(api.pushNotifications.removeExpoPushToken);

  const lastTokenRef = useRef<string | null>(null);
  const hadSessionRef = useRef(false);

  useEffect(() => {
    void ensureAndroidChannel();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openMentionFromData(router, response.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      openMentionFromData(router, response.notification.request.content.data as Record<string, unknown>);
    });
  }, [router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      hadSessionRef.current = true;
      return;
    }
    if (isLoading) return;

    if (!isAuthenticated && hadSessionRef.current) {
      hadSessionRef.current = false;
      const token = lastTokenRef.current;
      lastTokenRef.current = null;
      if (token) {
        void removeToken({ token }).catch(() => {});
      }
    }
  }, [isAuthenticated, isLoading, removeToken]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const projectId = resolveEasProjectId();
    if (!projectId) {
      console.warn('[push] Missing EAS project id (expo.extra.eas.projectId); cannot register for remote push');
      return;
    }

    let cancelled = false;

    const syncPushRegistration = async () => {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== 'granted' || cancelled) return;
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled || !token) return;
        lastTokenRef.current = token;
        await registerToken({ token });
      } catch (e) {
        console.warn('[push] getExpoPushTokenAsync failed', e);
      }
    };

    void syncPushRegistration();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, registerToken]);

  return null;
}
