import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, router } from 'expo-router';
import { HomeIcon, CompassIcon, UserIcon } from 'lucide-react-native';
import { useConvexAuth } from 'convex/react';
import { RN_STYLE } from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { theme: colorScheme } = useUniwind();
  const t = colorScheme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;

  React.useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
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
            <CompassIcon size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
