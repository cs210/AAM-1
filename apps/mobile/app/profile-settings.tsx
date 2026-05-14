import React from 'react';
import { Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { ArrowLeftIcon, ChevronRightIcon, LogOutIcon, Trash2Icon } from 'lucide-react-native';
import { useUniwind } from 'uniwind';
import {
  RN_API_BACKGROUND_DARK,
  RN_API_BACKGROUND_LIGHT,
  RN_API_BORDER_DARK,
  RN_API_BORDER_LIGHT,
  RN_API_CARD_DARK,
  RN_API_CARD_LIGHT,
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
  const background = isDark ? RN_API_BACKGROUND_DARK : RN_API_BACKGROUND_LIGHT;
  const card = isDark ? RN_API_CARD_DARK : RN_API_CARD_LIGHT;
  const border = isDark ? RN_API_BORDER_DARK : RN_API_BORDER_LIGHT;

  const currentUser = useQuery(api.auth.getCurrentUser);
  const prefs = useQuery(api.socialNotifications.getPrefs);
  const setMutedSocial = useMutation(api.socialNotifications.setMutedSocial);
  const [busy, setBusy] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

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

  const closeDeleteModal = () => {
    if (deleteBusy) return;
    setDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError(null);
  };

  const deleteAccount = async () => {
    const password = deletePassword.trim();
    if (!password || deleteBusy) return;

    setDeleteError(null);
    setDeleteBusy(true);
    try {
      const { authClient } = await import('@/lib/auth-client');
      const { error } = await authClient.deleteUser({ password });
      if (error) {
        setDeleteError(error.message ?? 'Could not delete account. Check your password.');
        return;
      }
      router.replace('/sign-in');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete account.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="border-border flex-row items-center gap-2 border-b px-4 pt-2 pb-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="p-2 active:opacity-70">
          <ArrowLeftIcon size={22} color={primaryHex} />
        </Pressable>
        <Text style={{ color: fg, fontSize: 20, fontWeight: '600' }}>Settings</Text>
      </View>

      <View className="flex-1 px-4 pt-4 pb-10">
        <Pressable
          accessibilityRole="button"
          onPress={() => void logOut()}
          className="border-destructive bg-background mb-8 h-11 w-full flex-row items-center justify-center gap-2 rounded-full border-2 active:opacity-80">
          <LogOutIcon size={18} color={destructiveHex} />
          <Text style={{ color: destructiveHex, fontSize: 16, fontWeight: '600' }}>Log out</Text>
        </Pressable>

        <SectionLabel muted={muted}>Check-in survey</SectionLabel>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/intake?redirect=/(tabs)/profile')}
          className="border-border bg-card mb-8 rounded-xl border px-4 py-4 active:opacity-90">
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
        <View className="border-border bg-card rounded-xl border px-4 py-4">
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

        <SectionLabel muted={muted}>Account</SectionLabel>
        <View className="border-border bg-card rounded-xl border px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text style={{ color: fg, fontSize: 16, fontWeight: '500' }}>Delete account</Text>
              <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
                Permanently remove your account and personal app data.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              onPress={() => setDeleteModalOpen(true)}
              className="border-destructive/30 bg-destructive/10 size-11 items-center justify-center rounded-full border active:opacity-80">
              <Trash2Icon size={18} color={destructiveHex} />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}>
        <View className="flex-1 justify-center bg-black/45 px-5">
          <View
            className="rounded-2xl border p-5"
            style={{ backgroundColor: card, borderColor: border }}>
            <Text style={{ color: fg, fontSize: 20, fontWeight: '700' }}>Delete account?</Text>
            <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
              This permanently deletes {currentUser?.email ?? 'your account'} and your profile,
              follows, bookmarks, check-ins, and notification settings.
            </Text>

            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleteBusy}
              placeholder="Password"
              placeholderTextColor={muted}
              returnKeyType="done"
              onSubmitEditing={() => void deleteAccount()}
              style={{
                backgroundColor: background,
                borderColor: border,
                borderRadius: 10,
                borderWidth: 1,
                color: fg,
                fontSize: 16,
                marginTop: 16,
                paddingHorizontal: 12,
                paddingVertical: 11,
              }}
            />

            {deleteError ? (
              <View className="border-destructive/40 bg-destructive/10 mt-3 rounded-lg border px-3 py-2">
                <Text style={{ color: destructiveHex, fontSize: 13, lineHeight: 18 }}>
                  {deleteError}
                </Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={closeDeleteModal}
                disabled={deleteBusy}
                className="border-border bg-background h-11 flex-1 items-center justify-center rounded-full border active:opacity-80">
                <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void deleteAccount()}
                disabled={!deletePassword.trim() || deleteBusy}
                className="bg-destructive h-11 flex-1 items-center justify-center rounded-full active:opacity-80 disabled:opacity-50">
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                  {deleteBusy ? 'Deleting…' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
