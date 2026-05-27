import React from 'react';
import { View, FlatList, Pressable, type ListRenderItem } from 'react-native';
import { ChevronRightIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';
import {
  HOME_CAROUSEL_CARD_GAP,
  HOME_CAROUSEL_CARD_WIDTH,
  HOME_CAROUSEL_SNAP_INTERVAL,
} from '@/constants/home-feed';

type HomeFeedSectionProps<T> = {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllAccessibilityLabel?: string;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  loading?: boolean;
  emptyComponent?: React.ReactNode;
  className?: string;
};

export function HomeFeedSection<T>({
  title,
  subtitle,
  onSeeAll,
  seeAllAccessibilityLabel = 'See all',
  data,
  keyExtractor,
  renderItem,
  loading = false,
  emptyComponent,
  className,
}: HomeFeedSectionProps<T>) {
  const brandPrimary = useBrandPrimaryHex();
  const showSeeAll = onSeeAll != null && data.length > 0;

  return (
    <View className={cn('mb-8', className)}>
      <View className="mb-3 flex-row items-end justify-between px-5">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-lg font-semibold text-foreground">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-muted-foreground">{subtitle}</Text>
          ) : null}
        </View>
        {showSeeAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={seeAllAccessibilityLabel}
            onPress={onSeeAll}
            className="flex-row items-center gap-0.5 active:opacity-80">
            <Text className="text-sm font-semibold text-primary">See all</Text>
            <ChevronRightIcon size={18} color={brandPrimary} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="items-center justify-center py-10">
          <BrandActivityIndicator size="small" />
        </View>
      ) : data.length === 0 ? (
        <View className="px-5">{emptyComponent}</View>
      ) : (
        <FlatList
          data={data}
          horizontal
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={HOME_CAROUSEL_SNAP_INTERVAL}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: HOME_CAROUSEL_CARD_GAP,
          }}
          getItemLayout={(_, index) => ({
            length: HOME_CAROUSEL_SNAP_INTERVAL,
            offset: HOME_CAROUSEL_SNAP_INTERVAL * index,
            index,
          })}
        />
      )}
    </View>
  );
}

export { HOME_CAROUSEL_CARD_WIDTH };
