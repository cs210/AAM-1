import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6">
        <Text className="text-3xl font-bold text-foreground mb-4">
          Explore
        </Text>
        <Text className="text-base text-muted-foreground mb-6">
          This app includes example code to help you get started.
        </Text>

        <View className="bg-card rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-card-foreground mb-2">
            File-based routing
          </Text>
          <Text className="text-muted-foreground">
            This app has two screens: app/(tabs)/index.tsx and app/(tabs)/explore.tsx
          </Text>
        </View>

        <View className="bg-card rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-card-foreground mb-2">
            Cross-platform
          </Text>
          <Text className="text-muted-foreground">
            You can open this project on Android, iOS, and the web.
          </Text>
        </View>

        <View className="bg-card rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-card-foreground mb-2">
            Tailwind CSS
          </Text>
          <Text className="text-muted-foreground">
            This template uses uniwind for Tailwind CSS support in React Native.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
