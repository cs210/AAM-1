import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { HomeIcon, CompassIcon, UserIcon } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <HomeIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <CompassIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={size} color={color} />
          ),
          // Tapping the Profile tab always goes to your own profile (no userId param)
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
