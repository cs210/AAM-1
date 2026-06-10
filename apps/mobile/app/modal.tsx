import { Link } from 'expo-router';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

export default function ModalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3" className="mb-4 text-center">
          This is a modal
        </Text>
        <Link href="/home" dismissTo asChild>
          <Pressable className="mt-4 py-3 active:opacity-70">
            <Text className="text-primary text-lg">Go to home screen</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
