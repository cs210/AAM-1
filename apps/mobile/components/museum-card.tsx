import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Doc } from '@packages/backend/convex/_generated/dataModel';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type MuseumCardData = Doc<"museums"> & {
  averageRating?: number | null;
  ratingCount?: number;
};

type Props = {
  museum: MuseumCardData;
  className?: string;
};

export function MuseumCard({ museum, className }: Props) {
  const displayRating = museum.averageRating 
    ? museum.averageRating.toFixed(1) 
    : '—';
  const ratingLabel = museum.ratingCount && museum.ratingCount > 0
    ? `★ ${displayRating} (${museum.ratingCount})`
    : 'No ratings yet';

  return (
    <Pressable 
      className={cn('mx-5 mb-3 active:opacity-90', className)}
      onPress={() => router.push(`/${museum._id}`)}
    >
      <Card className="border-[#E8E8E8]">
        <CardHeader className="pb-2">
          <View className="flex-row justify-between items-start">
            <Text className="text-lg font-semibold text-[#1A1A1A] flex-1 leading-6" numberOfLines={2}>
              {museum.name}
            </Text>
            <View className="bg-[#D4915A]/15 px-2.5 py-1 rounded-lg ml-3">
              <Text className="text-[11px] text-[#D4915A] font-semibold capitalize">
                {museum.category}
              </Text>
            </View>
          </View>
        </CardHeader>
        <CardContent className="pt-0">
          <Text className="text-sm text-[#666] mb-3">
            {museum.location?.city || 'Unknown'}, {museum.location?.state || ''}
          </Text>
          <Text className="text-[13px] text-[#D4915A] font-medium">
            {ratingLabel}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}
