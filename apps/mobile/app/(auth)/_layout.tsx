import { api } from '@packages/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

export default function AuthLayout() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) return <View className="flex-1 bg-background" />;
  if (user) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
