import React from 'react';
import { Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { ChevronRightIcon, LogOutIcon, MapIcon, Trash2Icon } from 'lucide-react-native';
import { isUsernameReadyForSubmit, UsernameField } from '@/components/username-field';
import { normalizeUsernameInput } from '@/lib/username';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';
import { useSoftwareFairMode } from '@/lib/software-fair-mode';
import { useUniwind } from 'uniwind';
import {
  RN_API_DESTRUCTIVE_DARK,
  RN_API_DESTRUCTIVE_LIGHT,
} from '@/constants/rn-api-colors';

type OrganizationMembership = {
  _id: string;
  name?: string;
  memberRole?: string | null;
};

export default function ProfileSettingsScreen() {
  const { theme } = useUniwind();
  const primaryHex = useBrandPrimaryHex();
  const destructiveHex = theme === 'dark' ? RN_API_DESTRUCTIVE_DARK : RN_API_DESTRUCTIVE_LIGHT;
  const softwareFair = useSoftwareFairMode();

  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentProfile = useQuery(api.userProfiles.getCurrentUserProfile);
  const setUsername = useMutation(api.userProfiles.setUsername);
  const myOrganizations = useQuery(api.admin.listMyOrganizations) as
    | OrganizationMembership[]
    | undefined;
  const prefs = useQuery(api.socialNotifications.getPrefs);
  const setMutedSocial = useMutation(api.socialNotifications.setMutedSocial);
  const [busy, setBusy] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [username, setUsernameValue] = React.useState('');
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [usernameBusy, setUsernameBusy] = React.useState(false);

  React.useEffect(() => {
    if (currentProfile?.username) {
      setUsernameValue(currentProfile.username);
    }
  }, [currentProfile?.username]);

  const [debouncedUsername, setDebouncedUsername] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(normalizeUsernameInput(username)), 300);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameAvailability = useQuery(
    api.userProfiles.isUsernameAvailable,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : 'skip'
  );

  const usernameChanged =
    normalizeUsernameInput(username) !== (currentProfile?.username ?? '');
  const canSaveUsername =
    usernameChanged &&
    isUsernameReadyForSubmit(username, usernameAvailability) &&
    !usernameBusy;

  const alertsEnabled = !prefs?.mutedSocial;
  const ownedOrganizations = React.useMemo(
    () => (myOrganizations ?? []).filter((organization) => organization.memberRole === 'owner'),
    [myOrganizations]
  );
  const isCheckingOrganizations = myOrganizations === undefined;
  const softwareFairActionDisabled = softwareFair.config === undefined || !softwareFair.enabled;
  const softwareFairActionLabel =
    softwareFair.config === undefined
      ? 'Loading'
      : !softwareFair.enabled
        ? 'Unavailable'
        : softwareFair.isJoined
          ? 'Exit'
          : 'Join';
  const softwareFairDescription =
    softwareFair.config === undefined
      ? 'Checking whether this experiment is available.'
      : !softwareFair.enabled
        ? 'Admins have not enabled this experiment yet.'
        : softwareFair.isJoined
          ? 'Software Fair mode is active on this device.'
          : 'Join the Stanford Software Fair experience from this device.';

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

  const saveUsername = async () => {
    if (!canSaveUsername) return;

    setUsernameError(null);
    setUsernameBusy(true);
    try {
      await setUsername({ username: normalizeUsernameInput(username) });
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Could not save username');
    } finally {
      setUsernameBusy(false);
    }
  };

  const deleteAccount = async () => {
    const password = deletePassword.trim();
    if (!password || deleteBusy || isCheckingOrganizations) return;

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
    <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenTitleBar title="Settings" onBackPress={() => router.back()} />

      <ScrollView
        className="flex-1"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        <Button
          variant="outline"
          className="mb-7 h-12 w-full border-2 border-destructive active:opacity-75"
          onPress={() => void logOut()}>
          <LogOutIcon size={18} color={destructiveHex} />
          <Text className="text-destructive text-base font-semibold">Log out</Text>
        </Button>

        <SectionLabel>Check-in survey</SectionLabel>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/intake?redirect=/(tabs)/profile')}
          className="border-border bg-card mb-7 rounded-2xl border px-4 py-4 active:opacity-75">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-foreground flex-1 text-base font-medium">Taste & interests</Text>
            <ChevronRightIcon size={20} color={primaryHex} />
          </View>
          <Text variant="muted" className="mt-1">
            Update your check-in survey responses
          </Text>
        </Pressable>

        <SectionLabel>Experimental</SectionLabel>
        <Card className="mb-7 gap-1 px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View
              className="size-10 items-center justify-center rounded-full border"
              style={{
                backgroundColor: `${primaryHex}1A`,
                borderColor: `${primaryHex}4D`,
              }}>
              <MapIcon size={18} color={primaryHex} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-foreground text-base font-medium">Stanford Software Fair</Text>
              <Text variant="muted" className="mt-1 leading-5">
                {softwareFairDescription}
              </Text>
            </View>
            <Button
              variant={softwareFair.isJoined ? 'outline' : 'default'}
              disabled={softwareFairActionDisabled}
              accessibilityLabel={
                softwareFair.isJoined ? 'Exit Software Fair mode' : 'Join Software Fair mode'
              }
              onPress={() => void (softwareFair.isJoined ? softwareFair.exit() : softwareFair.join())}>
              <Text>{softwareFairActionLabel}</Text>
            </Button>
          </View>
        </Card>

        <SectionLabel>Notifications</SectionLabel>
        <Card className="mb-7 gap-1 px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-foreground flex-1 text-base font-medium">Social notifications</Text>
            {prefs === undefined ? (
              <Text variant="muted">Loading…</Text>
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
          <Text variant="muted" className="leading-5">
            When someone @mentions you in a check-in review, or other social alerts, notify me
            (in-app).
          </Text>
        </Card>

        <SectionLabel>Username</SectionLabel>
        <Card className="mb-7 gap-0 px-4 py-4">
          {currentProfile === undefined ? (
            <Text variant="muted">Loading profile…</Text>
          ) : (
            <>
              <UsernameField value={username} onChangeText={setUsernameValue} />
              {usernameError ? (
                <Text className="text-destructive mt-2 text-sm">{usernameError}</Text>
              ) : null}
              <Button
                className="mt-3 w-full"
                size="lg"
                disabled={!canSaveUsername}
                onPress={() => void saveUsername()}>
                <Text>{usernameBusy ? 'Saving…' : 'Save username'}</Text>
              </Button>
            </>
          )}
        </Card>

        <SectionLabel>Account</SectionLabel>
        <Card className="mb-7 px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-foreground text-base font-medium">Delete account</Text>
              <Text variant="muted" className="mt-1 leading-5">
                Permanently remove your account and personal app data.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              onPress={() => setDeleteModalOpen(true)}
              className="border-destructive/30 bg-destructive/10 size-11 items-center justify-center rounded-full border active:opacity-75">
              <Trash2Icon size={18} color={destructiveHex} />
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}>
        <View className="flex-1 justify-center bg-black/45 px-5">
          <Card className="gap-0 px-5 py-5">
            <Text className="text-foreground text-xl font-bold">Delete account?</Text>
            <Text variant="muted" className="mt-2 leading-5">
              This permanently deletes {currentUser?.email ?? 'your account'} and your profile,
              follows, bookmarks, check-ins, and notification settings.
            </Text>

            {isCheckingOrganizations ? (
              <View className="border-border bg-card mt-3.5 rounded-lg border px-3 py-2.5">
                <Text variant="muted" className="text-[13px] leading-[18px]">
                  Checking museum dashboard memberships...
                </Text>
              </View>
            ) : myOrganizations && myOrganizations.length > 0 ? (
              <View className="border-destructive/40 bg-destructive/10 mt-3.5 rounded-lg border px-3 py-2.5">
                <Text className="text-destructive text-sm font-bold">
                  This also deletes your web museum dashboard account.
                </Text>
                <Text className="text-destructive mt-1.5 text-[13px] leading-[18px]">
                  You will leave{' '}
                  {myOrganizations.length === 1 ? 'this organization' : 'these organizations'}:
                </Text>
                <View className="mt-1 max-h-[72px]">
                  {myOrganizations.map((organization) => (
                    <Text
                      key={organization._id}
                      numberOfLines={1}
                      className="text-destructive text-[13px] leading-[18px]">
                      - {organization.name ?? organization._id}
                      {organization.memberRole === 'owner' ? ' (owner)' : ''}
                    </Text>
                  ))}
                </View>
                {ownedOrganizations.length > 0 ? (
                  <Text className="text-destructive mt-1.5 text-[13px] font-bold leading-[18px]">
                    You own {ownedOrganizations.length === 1 ? 'an organization' : 'organizations'}.
                    Transfer ownership in the web dashboard first, or continue and leave owned
                    organizations without an owner.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Input
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleteBusy}
              placeholder="Password"
              returnKeyType="done"
              onSubmitEditing={() => void deleteAccount()}
              className="mt-4"
            />

            {deleteError ? (
              <View className="border-destructive/40 bg-destructive/10 mt-3 rounded-lg border px-3 py-2">
                <Text className="text-destructive text-[13px] leading-[18px]">{deleteError}</Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={deleteBusy}
                onPress={closeDeleteModal}>
                <Text>Cancel</Text>
              </Button>
              <Button
                variant="destructive"
                className="h-11 flex-1"
                disabled={!deletePassword.trim() || deleteBusy || isCheckingOrganizations}
                onPress={() => void deleteAccount()}>
                <Text>{deleteBusy ? 'Deleting…' : 'Delete'}</Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
      {children}
    </Text>
  );
}
