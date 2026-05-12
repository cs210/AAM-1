import { Text } from '@/components/ui/text';
import { api } from '@packages/backend/convex/_generated/api';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';

export default function PostAuthScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const posthog = usePostHog();
  const getOrCreateProfile = useMutation(api.userProfiles.getOrCreateUserProfile);
  const currentUser = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : 'skip');
  const userInterests = useQuery(api.userInterests.getForCurrentAccount, isAuthenticated ? {} : 'skip');
  const [profileCreated, setProfileCreated] = React.useState(false);

  // Wait for Convex auth token to be ready before calling mutations
  React.useEffect(() => {
    if (!isAuthenticated || profileCreated) return;
    getOrCreateProfile()
      .then(() => {
        if (currentUser) {
          posthog?.identify(currentUser._id, {
            email: currentUser.email,
            name: currentUser.name,
          });
        }
        setProfileCreated(true);
      })
      .catch((error) => {
        console.error('Failed to create user profile:', error);
        // Still set to true to allow the flow to continue
        setProfileCreated(true);
      });
  }, [isAuthenticated, profileCreated, getOrCreateProfile, currentUser, posthog]);

  // Then check user interests and redirect
  React.useEffect(() => {
    if (!profileCreated || userInterests === undefined) return;

    if (userInterests === null) {
      router.replace('/intake?redirect=/home');
    } else {
      router.replace('/home');
    }
  }, [userInterests, profileCreated]);

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

