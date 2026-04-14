import React from 'react';
import { Pressable, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, router } from 'expo-router';
import { HomeIcon, CompassIcon, UserIcon } from 'lucide-react-native';
import { useConvexAuth } from 'convex/react';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  React.useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#D4915A" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D4915A',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
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
          tabBarButton: (props) => {
            const { onPress, ref, ...rest } = props;
            return (
              <Pressable
                {...rest}
                ref={ref as any}
                onPress={() => router.replace('/(tabs)/profile')}
              />
            );
          },
        }}
      />
    </Tabs>
  );
}
