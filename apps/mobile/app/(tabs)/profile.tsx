import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Text as UiText } from '@/components/ui/text';

export default function ProfileScreen() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-6 gap-4">
        <UiText className="text-3xl font-bold text-foreground">Profile</UiText>
        {user === undefined ? (
          <UiText className="text-muted-foreground">Loading profile…</UiText>
        ) : user ? (
          <>
            <View className="gap-2 rounded-lg border border-border bg-card p-4">
              <UiText className="text-sm text-muted-foreground">Name</UiText>
              <UiText className="text-base text-foreground">{user.name ?? "Not set"}</UiText>
            </View>

            <View className="gap-2 rounded-lg border border-border bg-card p-4">
              <UiText className="text-sm text-muted-foreground">Email</UiText>
              <UiText className="text-base text-foreground">{user.email}</UiText>
            </View>

            <View className="gap-2 rounded-lg border border-border bg-card p-4">
              <UiText className="text-sm text-muted-foreground">User ID</UiText>
              <UiText className="text-base text-foreground">{user._id}</UiText>
            </View>

            <Button variant="outline" onPress={() => authClient.signOut()}>
              <UiText>Sign out</UiText>
            </Button>
          </>
        ) : (
          <UiText className="text-muted-foreground">Not signed in.</UiText>
        )}
      </View>
    </SafeAreaView>
  );
}
