import { Text } from '@/components/ui/text';
import { routeAfterUsernameSetup } from '@/lib/post-auth-routing';
import { api } from '@packages/backend/convex/_generated/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';

const PENDING_USERNAME_KEY = 'pendingUsername';

export default function PostAuthScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const posthog = usePostHog();
  const getOrCreateProfile = useMutation(api.userProfiles.getOrCreateUserProfile);
  const setUsername = useMutation(api.userProfiles.setUsername);
  const currentUser = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : 'skip');
  const currentProfile = useQuery(
    api.userProfiles.getCurrentUserProfile,
    isAuthenticated ? undefined : 'skip'
  );
  const userInterests = useQuery(api.userInterests.getForCurrentAccount, isAuthenticated ? {} : 'skip');
  const [setupComplete, setSetupComplete] = React.useState(false);
  const [appliedPendingUsername, setAppliedPendingUsername] = React.useState(false);

  React.useEffect(() => {
    if (isAuthLoading || !isAuthenticated || setupComplete) return;

    let cancelled = false;

    async function runPostAuthSetup() {
      try {
        await getOrCreateProfile();

        if (currentUser) {
          posthog?.identify(currentUser._id, {
            email: currentUser.email,
            name: currentUser.name,
          });
        }

        let pendingUsername: string | null = null;
        try {
          pendingUsername = await AsyncStorage.getItem(PENDING_USERNAME_KEY);
          if (pendingUsername) {
            await AsyncStorage.removeItem(PENDING_USERNAME_KEY);
            await setUsername({ username: pendingUsername });
            if (!cancelled) {
              setAppliedPendingUsername(true);
            }
          }
        } catch (storageError) {
          console.error('Failed to apply pending username:', storageError);
        }
      } catch (error) {
        console.error('Failed to complete post-auth setup:', error);
      } finally {
        if (!cancelled) {
          setSetupComplete(true);
        }
      }
    }

    void runPostAuthSetup();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthLoading,
    isAuthenticated,
    setupComplete,
    getOrCreateProfile,
    setUsername,
    currentUser,
    posthog,
  ]);

  React.useEffect(() => {
    if (!setupComplete || currentProfile === undefined || userInterests === undefined) return;

    if (!appliedPendingUsername && !currentProfile?.username) {
      router.replace('/username-setup');
      return;
    }

    routeAfterUsernameSetup(userInterests);
  }, [setupComplete, currentProfile, userInterests, appliedPendingUsername]);

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground text-base">
          Getting things ready for you...
        </Text>
      </View>
    </SafeAreaView>
  );
}
