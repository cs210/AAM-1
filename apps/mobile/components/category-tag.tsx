import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type CategoryTagProps = {
  category: string;
  className?: string;
  /** Use on photo overlays (e.g. museum cards with a hero image). */
  variant?: 'default' | 'onImage';
};

export function CategoryTag({ category, className, variant = 'default' }: CategoryTagProps) {
  const onImage = variant === 'onImage';

  return (
    <View
      className={cn(
        'rounded-full border px-2.5 py-1',
        onImage ? 'border-white/30 bg-white/20' : 'border-border bg-muted',
        className
      )}
      accessibilityRole="text"
      accessibilityLabel={`Museum type: ${category}`}>
      <Text
        className={cn(
          'text-xs font-medium capitalize',
          onImage ? 'text-white' : 'text-foreground'
        )}>
        {category}
      </Text>
    </View>
  );
}
