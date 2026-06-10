import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDownIcon, ChevronUpIcon, MapIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useBrandPrimaryHex } from '@/hooks/use-brand-primary';
import { useSoftwareFairMode } from '@/lib/software-fair-mode';

export function SoftwareFairHomeSection() {
  const primaryHex = useBrandPrimaryHex();
  const {
    announcementBody,
    announcementCollapsed,
    announcementCtaLabel,
    announcementTitle,
    collapseAnnouncement,
    enabled,
    expandAnnouncement,
    exit,
    isJoined,
    join,
    shouldShowHomeSection,
  } = useSoftwareFairMode();

  if (!enabled || !shouldShowHomeSection) return null;

  const title = isJoined ? 'Software Fair mode is on' : announcementTitle;
  const body = isJoined ? 'You are joined on this device.' : announcementBody;

  if (announcementCollapsed) {
    return (
      <View className="mb-5 px-5">
        <View className="flex-row items-center gap-2 border-y border-border/70 py-2">
          <MapIcon size={14} color={primaryHex} />
          <Text numberOfLines={1} className="min-w-0 flex-1 text-xs font-medium text-foreground">
            {isJoined ? 'Software Fair mode active' : announcementTitle}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isJoined ? 'Exit Software Fair mode' : 'Join Software Fair mode'}
            onPress={() => void (isJoined ? exit() : join())}
            className="rounded-full px-2 py-1 active:opacity-75">
            <Text className="text-xs font-semibold text-primary">
              {isJoined ? 'Exit' : announcementCtaLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expand Stanford Software Fair announcement"
            hitSlop={8}
            onPress={() => void expandAnnouncement()}
            className="rounded-full p-1 active:opacity-75">
            <ChevronDownIcon size={15} color={primaryHex} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-5 px-5">
      <View className="border-y border-border/70 py-3">
        <View className="flex-row items-start gap-2.5">
          <View className="mt-0.5">
            <MapIcon size={15} color={primaryHex} />
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
              {title}
            </Text>
            <Text numberOfLines={2} className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {body}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Collapse Stanford Software Fair announcement"
            hitSlop={8}
            onPress={() => void collapseAnnouncement()}
            className="rounded-full p-1 active:opacity-75">
            <ChevronUpIcon size={15} color={primaryHex} />
          </Pressable>
        </View>
        <View className="mt-2 flex-row items-center gap-2 pl-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isJoined ? 'Exit Software Fair mode' : 'Join Software Fair mode'}
            onPress={() => void (isJoined ? exit() : join())}
            className="rounded-full bg-primary/10 px-3 py-1.5 active:opacity-80">
            <Text className="text-xs font-semibold text-primary">
              {isJoined ? 'Exit mode' : announcementCtaLabel}
            </Text>
          </Pressable>
          {isJoined ? (
            <Text className="text-xs font-medium text-primary">Active on this device</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
