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
  imageUrls?: string[];
  createdAt: number;
  editedAt?: number;
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
};

const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
  shadowColor: '#000000',
} as const;

export const CheckinPost = ({
  checkin,
  cardIndex = 0,
  isOwnCheckin,
  onEditPress,
  openOnReviewsTab,
}: CheckinPostProps) => {
  const brandPrimary = useBrandPrimaryHex();
  const { theme } = useUniwind();
  const mutedHex = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  const variant = CARD_VARIANTS[cardIndex % CARD_VARIANTS.length];
  const { isBookmarked, toggleBookmark } = useBookmark(checkin.contentId as Id<'museums'>);

  const handlePress = () => {
    if (openOnReviewsTab) {
      router.push(`/(museums)/${checkin.contentId}?tab=reviews&highlight=${encodeURIComponent(checkin._id)}`);
    } else {
      router.push(`/(museums)/${checkin.contentId}`);
    }
  };

  const renderStars = (rating: number) => (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          size={16}
          color={star <= rating ? brandPrimary : 'rgba(0,0,0,0.15)'}
          fill={star <= rating ? brandPrimary : 'none'}
        />
      ))}
    </View>
  );

  return (
    <Pressable
      className="mb-4 active:opacity-95"
      onPress={handlePress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
      <Card
        className={cn(
          'gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm shadow-black/5',
          variant.border
        )}
        style={CARD_SHADOW}>
        <View className="mb-3.5 flex-row items-start justify-between">
          <View className="mr-3 flex-1 flex-row items-center">
            <Avatar className="mr-3 size-11" alt={checkin.userName}>
              {checkin.userImage ? (
                <AvatarImage source={{ uri: checkin.userImage }} />
              ) : null}
              <AvatarFallback className="bg-primary">
                <Text className="text-base font-bold text-primary-foreground">
                  {checkin.userName.charAt(0).toUpperCase()}
                </Text>
              </AvatarFallback>
            </Avatar>
            <View className="min-w-0 flex-1">
              <View className="mb-0.5 flex-row items-center gap-1.5">
                <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                  {checkin.userName}
                </Text>
                {isOwnCheckin && onEditPress && (
                  <Pressable
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit check-in"
                    onPress={onEditPress}
                    className="shrink-0 rounded-md p-1 active:opacity-70">
                    <PencilIcon size={16} color={brandPrimary} />
                  </Pressable>
                )}
              </View>
              <Text className="text-sm font-medium text-muted-foreground" numberOfLines={1}>
                {checkin.contentName}
              </Text>
            </View>
          </View>

          {checkin.rating ? (
            <View className="items-end gap-1.5">
              {renderStars(checkin.rating)}
              <Text className={cn('text-base font-bold', variant.accentText)}>
                {checkin.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {checkin.review ? (
          <Text className="mb-3 text-sm leading-6 text-foreground" numberOfLines={3}>
            {checkin.review}
          </Text>
        ) : null}

        <View className="relative">
          {checkin.imageUrls && checkin.imageUrls.length > 0 ? (
            <View className="mt-0.5 flex-row">
              {checkin.imageUrls.slice(0, 3).map((url, index) => (
                <Image
                  key={`${checkin._id}-photo-${index}`}
                  source={{ uri: url }}
                  className={cn('size-18 rounded-lg bg-muted', index > 0 && 'ml-2')}
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
      </Card>
    </Pressable>
  );
};
