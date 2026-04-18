import { router, Stack } from 'expo-router';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConvexAuth } from 'convex/react';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';

const SCREEN_OPTIONS = {
  title: 'Museum&',
  headerShown: false,
};

export default function Screen() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  React.useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace('/post-auth');
    } else {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <SafeAreaView className="flex-1 items-center justify-center bg-background" style={{ flex: 1 }}>
        <BrandActivityIndicator size="large" />
        <Text variant="muted" className="mt-4 text-base">
          Loading...
        </Text>
      </SafeAreaView>
    </>
  );
}
