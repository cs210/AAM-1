import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { getCategoryTagStyles } from '@/lib/museum-category-tag-styles';
import { cn } from '@/lib/utils';

type CategoryTagProps = {
  category: string;
  className?: string;
  /** Use on photo overlays (e.g. museum cards with a hero image). */
  variant?: 'default' | 'onImage';
};

export function CategoryTag({ category, className, variant = 'default' }: CategoryTagProps) {
  const styles = getCategoryTagStyles(category, variant);

  return (
    <View
      className={cn('rounded-full border px-2.5 py-1', styles.container, className)}
      accessibilityRole="text"
      accessibilityLabel={`Museum type: ${category}`}>
      <Text className={cn('text-xs font-medium capitalize', styles.text)}>{category}</Text>
    </View>
  );
}
