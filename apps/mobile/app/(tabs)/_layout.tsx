import { api } from '@packages/backend/convex/_generated/api';
import { Text as UiText } from '@/components/ui/text';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ActivityIndicator, View } from 'react-native';

export default function TabLayout() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator />
        <UiText className="text-muted-foreground">Loading your session...</UiText>
      </View>
    );
  }
  if (!user) return <Redirect href="/sign-in" />;

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
