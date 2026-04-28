import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { ArrowLeftIcon, ChevronRightIcon, LogOutIcon } from 'lucide-react-native';
import { useUniwind } from 'uniwind';
import {
  RN_API_DESTRUCTIVE_DARK,
  RN_API_DESTRUCTIVE_LIGHT,
  RN_API_FOREGROUND_DARK,
  RN_API_FOREGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_DARK,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';

/** Screen copy uses RN `Text` + `style` + `rn-api-colors` (Uniwind `className` on Text was invisible here). */
export default function ProfileSettingsScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const primaryHex = isDark ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const destructiveHex = isDark ? RN_API_DESTRUCTIVE_DARK : RN_API_DESTRUCTIVE_LIGHT;
  const fg = isDark ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const muted = isDark ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;

  const prefs = useQuery(api.socialNotifications.getPrefs);
  const setMutedSocial = useMutation(api.socialNotifications.setMutedSocial);
  const [busy, setBusy] = React.useState(false);

  const alertsEnabled = !prefs?.mutedSocial;

  const toggleAlerts = async (enabled: boolean) => {
    setBusy(true);
    try {
      await setMutedSocial({ muted: !enabled });
    } finally {
      setBusy(false);
    }
  };

  const logOut = async () => {
    const { authClient } = await import('@/lib/auth-client');
    await authClient.signOut();
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center gap-2 border-b border-border px-4 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="p-2 active:opacity-70">
          <ArrowLeftIcon size={22} color={primaryHex} />
        </Pressable>
        <Text style={{ color: fg, fontSize: 20, fontWeight: '600' }}>Settings</Text>
      </View>

      <View className="flex-1 px-4 pb-10 pt-4">
        <Pressable
          accessibilityRole="button"
          onPress={() => void logOut()}
          className="mb-8 h-11 w-full flex-row items-center justify-center gap-2 rounded-full border-2 border-destructive bg-background active:opacity-80">
          <LogOutIcon size={18} color={destructiveHex} />
          <Text style={{ color: destructiveHex, fontSize: 16, fontWeight: '600' }}>Log out</Text>
        </Pressable>

        <SectionLabel muted={muted}>Check-in survey</SectionLabel>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/intake?redirect=/(tabs)/profile')}
          className="mb-8 rounded-xl border border-border bg-card px-4 py-4 active:opacity-90">
          <View className="flex-row items-center justify-between gap-2">
            <Text style={{ color: fg, flex: 1, fontSize: 16, fontWeight: '500' }}>
              Taste & interests
            </Text>
            <ChevronRightIcon size={20} color={primaryHex} />
          </View>
          <Text style={{ color: muted, fontSize: 14, marginTop: 4 }}>
            Update your check-in survey responses
          </Text>
        </Pressable>

        <SectionLabel muted={muted}>Notifications</SectionLabel>
        <View className="rounded-xl border border-border bg-card px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text style={{ color: fg, flex: 1, fontSize: 16, fontWeight: '500' }}>
              Social notifications
            </Text>
            {prefs === undefined ? (
              <Text style={{ color: muted, fontSize: 14 }}>Loading…</Text>
            ) : (
              <Switch
                value={alertsEnabled}
                onValueChange={toggleAlerts}
                disabled={busy}
                trackColor={{ false: undefined, true: primaryHex }}
                accessibilityLabel="Social notifications"
              />
            )}
          </View>
          <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
            When someone @mentions you in a check-in review, or other social alerts, notify me
            (in-app).
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SectionLabel({ children, muted }: { children: React.ReactNode; muted: string }) {
  return (
    <Text
      style={{
        color: muted,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
        marginBottom: 8,
        textTransform: 'uppercase',
      }}>
      {children}
    </Text>
  );
}
