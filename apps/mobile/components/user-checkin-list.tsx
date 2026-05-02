import React from 'react';
import { View, Pressable } from 'react-native';
import { StarIcon, CalendarIcon, ClockIcon } from 'lucide-react-native';
import type { Id } from '@packages/backend/convex/_generated/dataModel';
import { Text } from '@/components/ui/text';
import { RN_API_PRIMARY_LIGHT, RN_API_MUTED_FOREGROUND_LIGHT } from '@/constants/rn-api-colors';

export interface UserCheckIn {
  _id: Id<'checkIns'>;
  rating?: number;
  review?: string;
  visitDate?: number;
  visitCalendarDate?: string;
  createdAt: number;
  editedAt?: number;
  durationHours?: number;
  imageUrls?: string[];
}

interface UserCheckInListProps {
  checkIns: UserCheckIn[];
  onCheckInPress: (checkIn: UserCheckIn) => void;
}

export function UserCheckInList({ checkIns, onCheckInPress }: UserCheckInListProps) {
  if (checkIns.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return null;
    if (hours < 1) return 'Less than 1 hour';
    if (hours === 1) return '1 hour';
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  };

  return (
    <View className="mt-5">
      <Text className="mb-3 text-lg font-semibold text-foreground">Past Visits</Text>
      <View className="gap-3">
        {checkIns.map((checkIn) => (
          <Pressable
            key={checkIn._id}
            className="rounded-xl border border-border bg-card p-4 active:bg-muted"
            onPress={() => onCheckInPress(checkIn)}>
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <CalendarIcon size={14} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                <Text className="text-sm text-muted-foreground">
                  {formatDate(checkIn.visitDate ?? checkIn.createdAt)}
                </Text>
              </View>
              {checkIn.rating != null && (
                <View className="flex-row items-center gap-1">
                  <StarIcon
                    size={14}
                    color={RN_API_PRIMARY_LIGHT}
                    fill={RN_API_PRIMARY_LIGHT}
                  />
                  <Text className="text-sm font-semibold text-primary">
                    {checkIn.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            {checkIn.review && (
              <Text className="mb-2 text-sm leading-5 text-foreground" numberOfLines={3}>
                {checkIn.review}
              </Text>
            )}

            <View className="flex-row items-center gap-3">
              {checkIn.durationHours != null && (
                <View className="flex-row items-center gap-1">
                  <ClockIcon size={12} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                  <Text className="text-xs text-muted-foreground">
                    {formatDuration(checkIn.durationHours)}
                  </Text>
                </View>
              )}
              {checkIn.imageUrls && checkIn.imageUrls.length > 0 && (
                <Text className="text-xs text-muted-foreground">
                  {checkIn.imageUrls.length} {checkIn.imageUrls.length === 1 ? 'photo' : 'photos'}
                </Text>
              )}
              {checkIn.editedAt != null && (
                <Text className="text-xs text-muted-foreground">Edited</Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
