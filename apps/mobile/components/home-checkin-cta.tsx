import React from 'react';
import { View, Pressable } from 'react-native';
import { PlusIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { HomeSectionShell } from '@/components/home-feed-section';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';

type Props = {
  onPress: () => void;
};

export function HomeCheckinCta({ onPress }: Props) {
  const brandPrimary = useBrandPrimaryHex();

  return (
    <HomeSectionShell
      header={
        <View className="flex-row items-start justify-between gap-3">
          <Text className="text-lg font-semibold text-foreground">Check In</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check in at a museum"
            onPress={onPress}
            hitSlop={8}
            className="shrink-0 p-1 active:opacity-80">
            <PlusIcon size={24} color={brandPrimary} />
          </Pressable>
        </View>
      }>
      <Text className="mt-4 px-5 text-sm leading-snug text-muted-foreground">
        Add your visit to your cultural passport, rate the experience, and share it with friends.
      </Text>
    </HomeSectionShell>
  );
}
