import { api } from '@packages/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { View } from 'react-native';

export default function TabLayout() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) return <View className="flex-1 bg-background" />;
  if (!user) return <Redirect href="/(auth)/sign-in" />;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account-circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
