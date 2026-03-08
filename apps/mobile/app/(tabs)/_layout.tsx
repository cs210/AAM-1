import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { HomeIcon, CompassIcon, UserIcon } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#A67C52',
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
