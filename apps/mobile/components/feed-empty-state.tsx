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

/** Layout-only — shape/radius comes from `Button` (pill / rounded-full). */
const PRIMARY_CTA_LAYOUT = 'h-auto min-h-[52px] border-0 px-8 py-4 shadow-sm shadow-black/10';

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
          className={PRIMARY_CTA_LAYOUT}
          onPress={() => router.push('/(tabs)/explore')}>
          <Text className="text-base font-semibold leading-normal">Explore Museums</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
