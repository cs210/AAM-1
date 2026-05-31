import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { isUsernameReadyForSubmit, UsernameField } from '@/components/username-field';
import { routeAfterUsernameSetup } from '@/lib/post-auth-routing';
import { normalizeUsernameInput } from '@/lib/username';
import { api } from '@packages/backend/convex/_generated/api';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UsernameSetupScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const [username, setUsername] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const setUsernameMutation = useMutation(api.userProfiles.setUsername);
  const currentProfile = useQuery(
    api.userProfiles.getCurrentUserProfile,
    isAuthenticated ? undefined : 'skip'
  );
  const userInterests = useQuery(api.userInterests.getForCurrentAccount, isAuthenticated ? {} : 'skip');

  const [debouncedUsername, setDebouncedUsername] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(normalizeUsernameInput(username)), 300);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameAvailability = useQuery(
    api.userProfiles.isUsernameAvailable,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : 'skip'
  );

  const canSubmit =
    isUsernameReadyForSubmit(username, usernameAvailability) && !isSaving;

  React.useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isAuthLoading]);

  React.useEffect(() => {
    if (currentProfile === undefined) return;
    if (currentProfile?.username) {
      routeAfterUsernameSetup(userInterests);
    }
  }, [currentProfile, userInterests]);

  async function onSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsSaving(true);
    try {
      await setUsernameMutation({ username: normalizeUsernameInput(username) });
      if (userInterests === undefined) {
        return;
      }
      routeAfterUsernameSetup(userInterests);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save username');
    } finally {
      setIsSaving(false);
    }
  }

  if (isAuthLoading || currentProfile === undefined) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (currentProfile?.username) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex-1 justify-center px-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-foreground text-3xl font-bold">Choose a username</Text>
            <Text className="text-muted-foreground text-base leading-6">
              Your username is how friends find you on Museum&. It is required before you can
              continue.
            </Text>
          </View>

          {error ? (
            <View className="rounded-xl border border-destructive/25 bg-destructive/10 p-3">
              <Text className="text-center text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          <UsernameField
            value={username}
            onChangeText={setUsername}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />

          <Button
            className="h-auto min-h-14 w-full py-4 shadow-md shadow-black/10"
            size="lg"
            disabled={!canSubmit}
            onPress={onSubmit}>
            <Text className="text-base font-semibold text-primary-foreground">
              {isSaving ? 'Saving username...' : 'Continue'}
            </Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
