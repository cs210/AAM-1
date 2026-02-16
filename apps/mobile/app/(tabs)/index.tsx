import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Text as UiText } from '@/components/ui/text';

export default function HomeScreen() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-6 gap-6">
        <UiText className="text-3xl font-bold text-foreground">Home</UiText>
        {user === undefined ? (
          <UiText className="text-muted-foreground">Loading…</UiText>
        ) : user ? (
          <UiText className="text-lg text-foreground">Welcome back, {user.name ?? user.email}.</UiText>
        ) : (
          <UiText className="text-muted-foreground">Please sign in to continue.</UiText>
        )}
      </View>
    </SafeAreaView>
  );
}
