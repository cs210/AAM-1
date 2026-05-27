import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { StarIcon, PencilIcon, Bookmark } from 'lucide-react-native';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';
import { useBookmark } from '@/hooks/useBookmark';
import { useUniwind } from 'uniwind';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import {
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';
import { HOME_CAROUSEL_CARD_HEIGHT, HOME_CAROUSEL_CARD_WIDTH } from '@/constants/home-feed';

export interface CheckinPostData {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  contentType: string;
  contentId: string;
  contentName: string;
  rating?: number;
  review?: string;
  visitDate?: number;
  durationHours?: number;
  friendUserIds?: string[];
  imageIds?: Id<'_storage'>[];
  imageUrls?: string[];
  createdAt: number;
  editedAt?: number;
  coVisitors?: Array<{ userId: string; userName: string; userImage?: string }>;
  attendedEventIds?: (Id<'events'> | Id<'exhibitions'>)[];
}

/** Left accent + rating color — theme chart tokens (synced with web). */
const CARD_VARIANTS = [
  { border: 'border-l-4 border-l-chart-1', accentText: 'text-chart-1' },
  { border: 'border-l-4 border-l-chart-2', accentText: 'text-chart-2' },
  { border: 'border-l-4 border-l-chart-3', accentText: 'text-chart-3' },
  { border: 'border-l-4 border-l-chart-4', accentText: 'text-chart-4' },
  { border: 'border-l-4 border-l-chart-5', accentText: 'text-chart-5' },
  { border: 'border-l-4 border-l-chart-1', accentText: 'text-chart-1' },
];

type CheckinPostProps = {
  checkin: CheckinPostData;
  cardIndex?: number;
  isOwnCheckin?: boolean;
  onEditPress?: () => void;
  openOnReviewsTab?: boolean;
  layout?: 'feed' | 'carousel';
};

const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: '#000000',
} as const;

const checkinVisitDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function formatCheckinVisitDate(timestamp: number): string {
  return checkinVisitDateFormatter.format(new Date(timestamp));
}

export const CheckinPost = ({
  checkin,
  cardIndex = 0,
  isOwnCheckin,
  onEditPress,
  openOnReviewsTab,
  layout = 'feed',
}: CheckinPostProps) => {
  const isCarousel = layout === 'carousel';
  const brandPrimary = useBrandPrimaryHex();
  const { theme } = useUniwind();
  const mutedHex = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  const variant = CARD_VARIANTS[cardIndex % CARD_VARIANTS.length];
  const { isBookmarked, toggleBookmark } = useBookmark(checkin.contentId as Id<'museums'>);
  const visitDateLabel = formatCheckinVisitDate(checkin.visitDate ?? checkin.createdAt);

  const handlePress = () => {
    if (openOnReviewsTab) {
      router.push(`/(museums)/${checkin.contentId}?tab=reviews&highlight=${encodeURIComponent(checkin._id)}`);
    } else {
      router.push(`/(museums)/${checkin.contentId}`);
    }
  };

  const handleProfilePress = () => {
    router.push(`/(tabs)/profile?userId=${encodeURIComponent(checkin.userId)}`);
  };

  const handleMuseumPress = (e: any) => {
    e.stopPropagation?.();
    router.push(`/(museums)/${checkin.contentId}`);
  };

  const handleCoVisitorPress = (visitorId: string, e: any) => {
    e.stopPropagation?.();
    router.push(`/(tabs)/profile?userId=${encodeURIComponent(visitorId)}`);
  };

  const renderStars = (rating: number, size = 16) => (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          size={size}
          color={star <= rating ? brandPrimary : 'rgba(0,0,0,0.15)'}
          fill={star <= rating ? brandPrimary : 'none'}
        />
      ))}
    </View>
  );

  return (
    <Pressable
      className={cn(isCarousel ? 'active:opacity-95' : 'mb-4 active:opacity-95')}
      style={isCarousel ? { width: HOME_CAROUSEL_CARD_WIDTH } : undefined}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
      <Card
        className={cn(
          'gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-black/5',
          isCarousel ? 'flex-col p-3' : 'p-5',
          variant.border
        )}
        style={isCarousel ? { ...CARD_SHADOW, height: HOME_CAROUSEL_CARD_HEIGHT } : CARD_SHADOW}>
        <View className={cn('flex-row items-start', isCarousel ? 'mb-0.5' : 'mb-3.5 justify-between')}>
          <Pressable onPress={handleProfilePress} className="flex-row items-start active:opacity-70">
            <Avatar className={cn('mr-2.5', isCarousel ? 'size-8' : 'size-11')} alt={checkin.userName}>
              {checkin.userImage ? (
                <AvatarImage source={{ uri: checkin.userImage }} />
              ) : null}
              <AvatarFallback className="bg-primary">
                <Text className="text-base font-bold text-primary-foreground">
                  {checkin.userName.charAt(0).toUpperCase()}
                </Text>
              </AvatarFallback>
            </Avatar>
          </Pressable>
          <View className="min-w-0 flex-1">
            <View className="mb-0.5 flex-row items-center gap-1.5">
              <Pressable onPress={handleProfilePress} className="flex-row items-start active:opacity-70">
                <Text
                  className={cn('font-bold text-foreground', isCarousel ? 'text-[15px]' : 'text-base')}
                  numberOfLines={1}>
                  {checkin.userName}
                </Text>
              </Pressable>
              {isOwnCheckin && onEditPress ? (
                <Pressable
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit check-in"
                  onPress={onEditPress}
                  className="shrink-0 rounded-md p-1 active:opacity-70">
                  <PencilIcon size={16} color={brandPrimary} />
                </Pressable>
              ) : null}
            </View>
            <View className={cn('gap-0.5', isCarousel ? 'flex-col items-start' : 'flex-row flex-wrap items-baseline gap-1')}>
              <View className="flex-row flex-wrap items-baseline gap-1">
                <Text className="text-xs font-medium text-muted-foreground">visited</Text>
                <Pressable onPress={handleMuseumPress} className="active:opacity-70">
                  <Text className="text-xs font-semibold text-foreground" numberOfLines={isCarousel ? 1 : undefined}>
                    {checkin.contentName}
                  </Text>
                </Pressable>
              </View>
              {!isCarousel && checkin.coVisitors && checkin.coVisitors.length > 0 ? (
                <View className="flex-row flex-wrap items-baseline gap-1">
                  <Text className="text-xs font-medium text-muted-foreground">with</Text>
                  {checkin.coVisitors.map((v, idx) => (
                    <View key={v.userId} className="flex-row items-baseline gap-1">
                      <Pressable onPress={(e) => handleCoVisitorPress(v.userId, e)} className="active:opacity-70">
                        <Text className="text-xs font-medium text-foreground">{v.userName}</Text>
                      </Pressable>
                      {idx < checkin.coVisitors!.length - 1 ? (
                        <Text className="text-xs font-medium text-muted-foreground">,</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {!isCarousel && checkin.rating ? (
            <View className="items-end gap-1.5">
              {renderStars(checkin.rating)}
              <Text className={cn('text-base font-bold', variant.accentText)}>
                {checkin.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {isCarousel && checkin.rating ? (
          <View className="mb-0.5 mt-1.5">{renderStars(checkin.rating, 14)}</View>
        ) : null}

        {checkin.review ? (
          <Text
            className={cn(
              'text-sm text-foreground',
              isCarousel ? 'mb-0.5 shrink leading-[17px]' : 'mb-2 leading-6'
            )}
            numberOfLines={3}>
            {checkin.review}
          </Text>
        ) : null}

        {!isCarousel ? (
          <Text className="mb-3 text-xs font-medium text-muted-foreground">{visitDateLabel}</Text>
        ) : null}

        {!isCarousel ? (
        <View className="relative pb-4">
          {checkin.imageUrls && checkin.imageUrls.length > 0 ? (
            <View className="mt-0.5 flex-row">
              {checkin.imageUrls.slice(0, 3).map((url, index) => (
                <Image
                  key={`${checkin._id}-photo-${index}`}
                  source={{ uri: url }}
                  className={cn('rounded-lg bg-muted size-18', index > 0 && 'ml-2')}
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : null}
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              onPress={toggleBookmark}
              className="absolute bottom-0 right-0 rounded-md p-1 active:opacity-70">
              <Bookmark
                size={20}
                color={isBookmarked ? brandPrimary : mutedHex}
                fill={isBookmarked ? brandPrimary : 'none'}
              />
            </Pressable>
        </View>
        ) : null}

        {isCarousel ? (
          <Text className="mt-auto text-xs font-medium text-muted-foreground">
            {visitDateLabel}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
};
