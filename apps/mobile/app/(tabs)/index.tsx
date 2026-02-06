import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-3xl font-bold text-foreground mb-4">
          Welcome!
        </Text>
        <Text className="text-lg text-muted-foreground text-center">
          Edit app/(tabs)/index.tsx to get started.
        </Text>
      </View>
    </SafeAreaView>
  );
}
