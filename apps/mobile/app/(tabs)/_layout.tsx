import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, router, useGlobalSearchParams } from 'expo-router';
import { HomeIcon, CompassIcon, UserIcon, ScanSearchIcon } from 'lucide-react-native';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { RN_STYLE } from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentProfile = useQuery(
    api.userProfiles.getCurrentUserProfile,
    isAuthenticated ? undefined : 'skip'
  );
  const { theme: colorScheme } = useUniwind();
  const t = colorScheme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;
  const { userId } = useGlobalSearchParams<{
    userId?: string | string[];
  }>();
  const profileUserId = Array.isArray(userId) ? userId[0] : userId;
  const isViewingSearchProfile = typeof profileUserId === 'string' && profileUserId.length > 0;

  React.useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isLoading]);

  React.useEffect(() => {
    if (isLoading || !isAuthenticated || currentProfile === undefined) return;
    if (!currentProfile?.username) {
      router.replace('/username-setup');
    }
  }, [isLoading, isAuthenticated, currentProfile]);

  if (isLoading || (isAuthenticated && currentProfile === undefined)) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background }}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!currentProfile?.username) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.mutedForeground,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: t.background,
          borderTopWidth: 1,
          borderTopColor: t.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <HomeIcon size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <CompassIcon size={28} color={isViewingSearchProfile ? t.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="visual-search"
        options={{
          title: 'Visual Search',
          tabBarIcon: ({ color, size }) => (
            <ScanSearchIcon size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={28} color={isViewingSearchProfile ? t.mutedForeground : color} />
          ),
        }}
      />
    </Tabs>
  );
}
