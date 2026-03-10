import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { StarIcon, PencilIcon } from 'lucide-react-native';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface CheckinPostData {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  museumId: string;
  museumName: string;
  rating?: number;
  review?: string;
  createdAt: number;
  editedAt?: number;
}

const CARD_COLORS = [
  { bg: 'bg-white', text: 'text-[#1A1A1A]', accent: '#D4915A', accentClass: 'text-[#D4915A]', shadowColor: '#D4915A' },
  { bg: 'bg-white', text: 'text-[#1A1A1A]', accent: '#4A90E2', accentClass: 'text-[#4A90E2]', shadowColor: '#4A90E2' },
  { bg: 'bg-white', text: 'text-[#1A1A1A]', accent: '#C9A96E', accentClass: 'text-[#C9A96E]', shadowColor: '#C9A96E' },
  { bg: 'bg-white', text: 'text-[#1A1A1A]', accent: '#5FA85F', accentClass: 'text-[#5FA85F]', shadowColor: '#5FA85F' },
  { bg: 'bg-white', text: 'text-[#1A1A1A]', accent: '#B87891', accentClass: 'text-[#B87891]', shadowColor: '#B87891' },
  { bg: 'bg-white', text: 'text-[#1A1A1A]', accent: '#7B7BAF', accentClass: 'text-[#7B7BAF]', shadowColor: '#7B7BAF' },
];

type CheckinPostProps = {
  checkin: CheckinPostData;
  cardIndex?: number;
  isOwnCheckin?: boolean;
  onEditPress?: () => void;
};

export const CheckinPost = ({ checkin, cardIndex = 0, isOwnCheckin, onEditPress }: CheckinPostProps) => {
  const handlePress = () => {
    router.push(`/(museums)/${checkin.museumId}`);
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
      className={cn('rounded-2xl p-5 mb-4 active:opacity-95', colorScheme.bg)}
      style={[
        styles.card,
        {
          shadowColor: colorScheme.shadowColor,
          borderLeftColor: colorScheme.accent,
          borderTopColor: `${colorScheme.accent}15`,
          borderRightColor: `${colorScheme.accent}15`,
          borderBottomColor: `${colorScheme.accent}15`,
        }
      ]}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
    >
      {/* Header: User info + Rating */}
      <View className="flex-row justify-between items-start mb-3.5">
        <View className="flex-row items-center flex-1 mr-3">
          <Avatar className="size-11 mr-3" alt={checkin.userName}>
            {checkin.userImage ? (
              <AvatarImage source={{ uri: checkin.userImage }} />
            ) : (
              <AvatarFallback className="bg-[#D4915A]">
                <Text className="text-base font-bold text-white">
                  {checkin.userName.charAt(0).toUpperCase()}
                </Text>
              </AvatarFallback>
            )}
          </Avatar>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Text className={cn('text-base font-bold', colorScheme.text)} numberOfLines={1}>
                {checkin.userName}
              </Text>
              {isOwnCheckin && onEditPress && (
                <Pressable onPress={() => onEditPress()} hitSlop={8}>
                  <PencilIcon size={16} color="#007AFF" />
                </Pressable>
              )}
            </View>
            <Text className={cn('text-sm font-medium opacity-70', colorScheme.text)} numberOfLines={1}>
              {checkin.museumName}
              {checkin.editedAt != null ? (
                <Text className="text-sm italic opacity-70"> · Edited</Text>
              ) : null}
            </Text>
          </View>
        </View>

        {checkin.rating && (
          <View className="items-end gap-1.5">
            {renderStars(checkin.rating)}
            <Text className={cn('text-base font-bold', colorScheme.accentClass)}>
              {checkin.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {checkin.review && (
        <Text className={cn('text-sm leading-[22px]', colorScheme.text)} numberOfLines={3}>
          {checkin.review}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
});
