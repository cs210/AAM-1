import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { ArrowLeftIcon, ChevronRightIcon, LogOutIcon, Trash2Icon } from 'lucide-react-native';
import { isUsernameReadyForSubmit, UsernameField } from '@/components/username-field';
import { normalizeUsernameInput } from '@/lib/username';
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

type OrganizationMembership = {
  _id: string;
  name?: string;
  memberRole?: string | null;
};

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderColor: border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeftIcon size={22} color={primaryHex} />
        </Pressable>
        <Text style={{ color: fg, fontSize: 20, fontWeight: '600' }}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          onPress={() => void logOut()}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: background, borderColor: destructiveHex },
            pressed && styles.pressed,
          ]}>
          <LogOutIcon size={18} color={destructiveHex} />
          <Text style={{ color: destructiveHex, fontSize: 16, fontWeight: '600' }}>Log out</Text>
        </Pressable>

        <SectionLabel muted={muted}>Check-in survey</SectionLabel>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/intake?redirect=/(tabs)/profile')}
          style={({ pressed }) => [
            styles.cardButton,
            { backgroundColor: card, borderColor: border },
            pressed && styles.pressed,
          ]}>
          <View style={styles.row}>
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
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.rowLargeGap}>
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

        <SectionLabel muted={muted}>Username</SectionLabel>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          {currentProfile === undefined ? (
            <Text style={{ color: muted, fontSize: 14 }}>Loading profile…</Text>
          ) : (
            <>
              <UsernameField value={username} onChangeText={setUsernameValue} />
              {usernameError ? (
                <Text style={{ color: destructiveHex, fontSize: 14, marginTop: 8 }}>
                  {usernameError}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save username"
                disabled={!canSaveUsername}
                onPress={() => void saveUsername()}
                style={({ pressed }) => [
                  styles.saveUsernameButton,
                  {
                    backgroundColor: canSaveUsername ? primaryHex : `${primaryHex}66`,
                  },
                  pressed && canSaveUsername && styles.pressed,
                ]}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                  {usernameBusy ? 'Saving…' : 'Save username'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <SectionLabel muted={muted}>Account</SectionLabel>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.rowLargeGap}>
            <View style={styles.flexOne}>
              <Text style={{ color: fg, fontSize: 16, fontWeight: '500' }}>Delete account</Text>
              <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
                Permanently remove your account and personal app data.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              onPress={() => setDeleteModalOpen(true)}
              style={({ pressed }) => [
                styles.deleteIconButton,
                {
                  backgroundColor: `${destructiveHex}1A`,
                  borderColor: `${destructiveHex}4D`,
                },
                pressed && styles.pressed,
              ]}>
              <Trash2Icon size={18} color={destructiveHex} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}>
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={{ color: fg, fontSize: 20, fontWeight: '700' }}>Delete account?</Text>
            <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
              This permanently deletes {currentUser?.email ?? 'your account'} and your profile,
              follows, bookmarks, check-ins, and notification settings.
            </Text>

            {isCheckingOrganizations ? (
              <View style={[styles.warningBox, { backgroundColor: card, borderColor: border }]}>
                <Text style={{ color: muted, fontSize: 13, lineHeight: 18 }}>
                  Checking museum dashboard memberships...
                </Text>
              </View>
            ) : myOrganizations.length > 0 ? (
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: `${destructiveHex}1A`,
                    borderColor: `${destructiveHex}66`,
                  },
                ]}>
                <Text style={{ color: destructiveHex, fontSize: 14, fontWeight: '700' }}>
                  This also deletes your web museum dashboard account.
                </Text>
                <Text style={{ color: destructiveHex, fontSize: 13, lineHeight: 18, marginTop: 6 }}>
                  You will leave {myOrganizations.length === 1 ? 'this organization' : 'these organizations'}:
                </Text>
                <View style={styles.organizationList}>
                  {myOrganizations.map((organization) => (
                    <Text
                      key={organization._id}
                      numberOfLines={1}
                      style={{ color: destructiveHex, fontSize: 13, lineHeight: 18 }}>
                      - {organization.name ?? organization._id}
                      {organization.memberRole === 'owner' ? ' (owner)' : ''}
                    </Text>
                  ))}
                </View>
                {ownedOrganizations.length > 0 ? (
                  <Text style={{ color: destructiveHex, fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 6 }}>
                    You own {ownedOrganizations.length === 1 ? 'an organization' : 'organizations'}. Transfer ownership in the web dashboard first, or continue and leave owned organizations without an owner.
                  </Text>
                ) : null}
              </View>
            ) : null}

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
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: `${destructiveHex}1A`,
                    borderColor: `${destructiveHex}66`,
                  },
                ]}>
                <Text style={{ color: destructiveHex, fontSize: 13, lineHeight: 18 }}>
                  {deleteError}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={closeDeleteModal}
                disabled={deleteBusy}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: background, borderColor: border },
                  pressed && !deleteBusy && styles.pressed,
                  deleteBusy && styles.disabled,
                ]}>
                <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void deleteAccount()}
                disabled={!deletePassword.trim() || deleteBusy || isCheckingOrganizations}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: destructiveHex, borderColor: destructiveHex },
                  pressed && deletePassword.trim() && !deleteBusy && !isCheckingOrganizations && styles.pressed,
                  (!deletePassword.trim() || deleteBusy || isCheckingOrganizations) && styles.disabled,
                ]}>
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

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 28,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardButton: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 28,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  deleteIconButton: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  disabled: {
    opacity: 0.5,
  },
  errorBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  flexOne: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  logoutButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    marginBottom: 28,
    width: '100%',
  },
  saveUsernameButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  organizationList: {
    marginTop: 4,
    maxHeight: 72,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  rowLargeGap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  warningBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

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
