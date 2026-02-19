import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Text className="mb-2 text-center text-3xl font-bold text-foreground">
          Welcome
        </Text>
        <Text className="mb-8 text-center text-lg text-muted-foreground">
          Tell us a bit about your museum interests so we can personalize your experience.
        </Text>
        <Link href="/intake" asChild>
          <Button size="lg" className="rounded-xl px-8">
            <Text>Start quick survey</Text>
          </Button>
        </Link>
      </View>
    </SafeAreaView>
  );
}
