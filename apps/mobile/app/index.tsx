import { router, Stack } from 'expo-router';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { useConvexAuth } from 'convex/react';
import { Text } from '@/components/ui/text';

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
      
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground text-base">
            Loading
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}
