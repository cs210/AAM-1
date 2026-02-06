import { Link } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ModalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-2xl font-bold text-foreground mb-4">
          This is a modal
        </Text>
        <Link href="/" dismissTo asChild>
          <Pressable className="mt-4 py-3">
            <Text className="text-primary text-lg">Go to home screen</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
