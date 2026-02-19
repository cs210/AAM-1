import { api } from '@packages/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
