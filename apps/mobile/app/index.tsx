import { api } from '@packages/backend/convex/_generated/api';
import { Text as UiText } from '@/components/ui/text';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator />
        <UiText className="text-muted-foreground">Checking your account...</UiText>
      </View>
    );
  }
  return user ? <Redirect href="/" /> : <Redirect href="/sign-in" />;
}
