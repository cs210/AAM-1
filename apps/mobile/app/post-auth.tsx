import { Text } from '@/components/ui/text';
import { api } from '@packages/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostAuthScreen() {
  const userInterests = useQuery(api.userInterests.getForCurrentAccount, {});

  React.useEffect(() => {
    if (userInterests === undefined) return;

    if (userInterests === null) {
      router.replace('/intake?redirect=/(tabs)');
    } else {
      router.replace('/(tabs)');
    }
  }, [userInterests]);

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

