import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { StarIcon } from 'lucide-react-native';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

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
  createdAt: number;
}

const CARD_COLORS = [
  { bg: 'bg-[#E8D5C4]', text: 'text-[#5C4033]', accent: '#A67C52', accentClass: 'text-[#A67C52]' },
  { bg: 'bg-[#D4E4F7]', text: 'text-[#2C5282]', accent: '#4A90E2', accentClass: 'text-[#4A90E2]' },
  { bg: 'bg-[#F5E6D3]', text: 'text-[#8B6F47]', accent: '#C9A96E', accentClass: 'text-[#C9A96E]' },
  { bg: 'bg-[#E8F4E8]', text: 'text-[#2D5F2D]', accent: '#5FA85F', accentClass: 'text-[#5FA85F]' },
  { bg: 'bg-[#F4E4E8]', text: 'text-[#6B3E4E]', accent: '#B87891', accentClass: 'text-[#B87891]' },
  { bg: 'bg-[#E6E6FA]', text: 'text-[#4B4B7E]', accent: '#7B7BAF', accentClass: 'text-[#7B7BAF]' },
];

export const CheckinPost = ({ checkin, cardIndex = 0 }: { checkin: CheckinPostData; cardIndex?: number }) => {
  const handlePress = () => {
    router.push(`/(museums)/${checkin.contentId}`);
  };

  const colorScheme = CARD_COLORS[cardIndex % CARD_COLORS.length];

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            size={16}
            color={star <= rating ? colorScheme.accent : 'rgba(0,0,0,0.15)'}
            fill={star <= rating ? colorScheme.accent : 'none'}
          />
        ))}
      </View>
    );
  };

  return (
    <Pressable
      className={cn('rounded-2xl p-5 mb-4 shadow-sm shadow-black/5 active:opacity-95', colorScheme.bg)}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
    >
      <View className="flex-row justify-between items-start mb-3.5">
        <View className="flex-row items-center flex-1 mr-3">
          <Avatar className="size-11 mr-3" alt={checkin.userName}>
            {checkin.userImage ? (
              <AvatarImage source={{ uri: checkin.userImage }} />
            ) : (
              <AvatarFallback className="bg-[#A67C52]">
                <Text className="text-lg font-bold text-white">
                  {checkin.userName.charAt(0).toUpperCase()}
                </Text>
              </AvatarFallback>
            )}
          </Avatar>
          <View className="flex-1">
            <Text className={cn('text-[17px] font-bold mb-0.5', colorScheme.text)} numberOfLines={1}>
              {checkin.userName}
            </Text>
            <Text className={cn('text-sm font-medium opacity-70', colorScheme.text)} numberOfLines={1}>
              {checkin.contentName}
            </Text>
          </View>
        </View>

        {checkin.rating && (
          <View className="items-end gap-1.5">
            {renderStars(checkin.rating)}
            <Text className={cn('text-[15px] font-bold', colorScheme.accentClass)}>
              {checkin.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {checkin.review && (
        <Text className={cn('text-[15px] leading-[22px]', colorScheme.text)} numberOfLines={3}>
          {checkin.review}
        </Text>
      )}
    </Pressable>
  );
};
