import { api } from '@packages/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function IndexScreen() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) return <View className="flex-1 bg-background" />;
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/sign-in" />;
}
