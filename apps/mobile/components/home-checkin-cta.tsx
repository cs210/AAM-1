import React from 'react';
import { View, Pressable } from 'react-native';
import { InfoIcon, PlusIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { HomeSectionShell } from '@/components/home-feed-section';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';

type Props = {
  onPress: () => void;
  showHint?: boolean;
  onDismissHint?: () => void;
};

export function HomeCheckinCta({ onPress, showHint = false, onDismissHint }: Props) {
  const brandPrimary = useBrandPrimaryHex();

  return (
    <HomeSectionShell
      header={
        <View className="gap-2">
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
          {showHint ? (
            <View className="border-primary/50 bg-primary/10 rounded-lg border p-3">
              <View className="flex-row items-start gap-2">
                <View className="mt-0.5">
                  <InfoIcon size={14} color={brandPrimary} />
                </View>
                <Text className="flex-1 text-xs leading-5 text-foreground">
                  Tap + to log your latest museum visit.
                </Text>
                {onDismissHint ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss check-in hint"
                    onPress={onDismissHint}
                    className="px-1">
                    <Text className="text-xs font-semibold text-muted-foreground">Dismiss</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      }>
      <Text className="mt-4 px-5 text-sm leading-snug text-muted-foreground">
        Add your visit to your cultural passport, rate the experience, and share it with friends.
      </Text>
    </HomeSectionShell>
  );
}
