import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Text as UiText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export default function HomeScreen() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-6 gap-6">
        <Button>
          <UiText>Click me</UiText>
        </Button>
      </View>
    </SafeAreaView>
  );
}