import React from 'react';
import { View, FlatList, Pressable, type ListRenderItem } from 'react-native';
import { ChevronRightIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';
import {
  HOME_CAROUSEL_CARD_GAP,
  HOME_CAROUSEL_CARD_WIDTH,
  HOME_CAROUSEL_SNAP_INTERVAL,
} from '@/constants/home-feed';

/** Horizontal inset for carousels (matches screen `px-5`). */
export const HOME_SECTION_INSET = 20;

type HomeSectionShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function HomeSectionShell({ header, children, className }: HomeSectionShellProps) {
  return (
    <View className={cn('mb-8', className)}>
      <View className="px-5">
        {header}
        <Separator className="mt-3 max-w-3/5 self-start bg-border" />
      </View>
      {children}
    </View>
  );
}

type HomeFeedSectionProps<T> = {
  title: string;
  titleAccessory?: React.ReactNode;
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
  titleAccessory,
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
    <HomeSectionShell
      className={className}
      header={
        <View className="flex-row items-end justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-lg font-semibold text-foreground">{title}</Text>
              {titleAccessory}
            </View>
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
      }>
      {loading ? (
        <View className="mt-4 items-center justify-center px-5">
          <BrandActivityIndicator size="small" />
        </View>
      ) : data.length === 0 ? (
        <View className="mt-4 px-5">{emptyComponent}</View>
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
          className="mt-4"
          contentContainerStyle={{
            paddingHorizontal: HOME_SECTION_INSET,
            gap: HOME_CAROUSEL_CARD_GAP,
          }}
          getItemLayout={(_, index) => ({
            length: HOME_CAROUSEL_SNAP_INTERVAL,
            offset: HOME_CAROUSEL_SNAP_INTERVAL * index,
            index,
          })}
        />
      )}
    </HomeSectionShell>
  );
}

export { HOME_CAROUSEL_CARD_WIDTH };
