import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';


/**
 * Empty home feed CTA. Colors are defined by `Button` + theme tokens, not the parent screen.
 */
export function FeedEmptyState() {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="items-center">
        <CardTitle className="text-center">No feed yet</CardTitle>
        <CardDescription className="text-center">
          Follow museums and users to see their events and check-ins here!
        </CardDescription>
      </CardHeader>
      <CardContent className="items-center pb-6">
        <Button
          size="lg"
          onPress={() => router.push('/(tabs)/explore')}>
          <Text className="">Explore Museums</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
