import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { HomeIcon, SearchIcon, UserIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useUniwind } from 'uniwind';

// Import tab screens
import HomeScreen from './(tabs)';
import SearchScreen from './(tabs)/explore';
import WrappedScreen from './(tabs)/profile';

type Screen = 'home' | 'search' | 'profile';

const NAV_ITEMS = [
  { id: 'home' as const, label: 'Home', icon: HomeIcon },
  { id: 'search' as const, label: 'Search', icon: SearchIcon },
  { id: 'profile' as const, label: 'Profile', icon: UserIcon },
];

export default function Index() {
  const [screen, setScreen] = useState<Screen>('home');
  const { theme } = useUniwind();
  const isLight = theme === 'light';
  const activeColor = '#007AFF';
  const inactiveColor = isLight ? '#8E8E93' : '#A0A0A0';
  const bgColor = isLight ? '#FFFFFF' : '#1C1C1E';
  const borderColor = isLight ? '#E5E5EA' : '#3C3C3D';

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen />;
      case 'search':
        return <SearchScreen />;
      case 'profile':
        return <WrappedScreen />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {renderScreen()}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          backgroundColor: bgColor,
        }}
      >
          {NAV_ITEMS.map((item) => {
            const isActive = screen === item.id;
            const Icon = item.icon;
            return (
              <Pressable
                key={item.id}
                onPress={() => setScreen(item.id)}
                style={{
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  flex: 1,
                }}
              >
                <Icon
                  size={24}
                  color={isActive ? activeColor : inactiveColor}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <Text
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color: isActive ? activeColor : inactiveColor,
                    fontWeight: isActive ? '600' : '400',
                    fontFamily: 'PublicSans',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
  );
}