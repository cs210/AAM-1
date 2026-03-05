import { Text } from '@/components/ui/text';
import { api } from '@packages/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostAuthScreen() {
  const getOrCreateProfile = useMutation(api.userProfiles.getOrCreateUserProfile);
  const userInterests = useQuery(api.userInterests.getForCurrentAccount, {});
  const [profileCreated, setProfileCreated] = React.useState(false);

  // First, ensure user profile exists
  React.useEffect(() => {
    if (!profileCreated) {
      getOrCreateProfile()
        .then(() => {
          setProfileCreated(true);
        })
        .catch((error) => {
          console.error('Failed to create user profile:', error);
          // Still set to true to allow the flow to continue
          setProfileCreated(true);
        });
    }
  }, [profileCreated, getOrCreateProfile]);

  // Then check user interests and redirect
  React.useEffect(() => {
    if (!profileCreated || userInterests === undefined) return;

    if (userInterests === null) {
      router.replace('/intake?redirect=/(tabs)');
    } else {
      router.replace('/(tabs)');
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

