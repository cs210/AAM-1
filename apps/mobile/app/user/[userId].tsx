import React, { useEffect } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { AuthGuard } from '@/components/AuthGuard';
import { ProfileScreen } from '@/app/(tabs)/profile';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Another user's profile outside the tab navigator (matches museum detail flow). */
export default function UserProfileRoute() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const userId = firstParam(params.userId);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;

  useEffect(() => {
    if (!userId) {
      router.replace('/(tabs)/explore');
      return;
    }
    if (currentUserId && userId === currentUserId) {
      router.replace('/(tabs)/profile');
    }
  }, [userId, currentUserId]);

  if (!userId || (currentUserId && userId === currentUserId)) {
    return null;
  }

  return (
    <AuthGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileScreen presentation="stack" stackUserId={userId} />
    </AuthGuard>
  );
}
