import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import type { Href } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { ArrowLeftIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { useUniwind } from 'uniwind';
import { RN_API_PRIMARY_DARK, RN_API_PRIMARY_LIGHT } from '@/constants/rn-api-colors';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const { theme } = useUniwind();
  const primaryHex = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const items = useQuery(api.socialNotifications.listForCurrentUser, { limit: 80 });
  const totalCount = useQuery(api.socialNotifications.totalCount);
  const markRead = useMutation(api.socialNotifications.markRead);
  const markAllRead = useMutation(api.socialNotifications.markAllRead);

  const onOpen = async (row: NonNullable<typeof items>[number]) => {
    if (row.readAt == null) {
      try {
        await markRead({ notificationId: row._id });
      } catch {
        // still navigate
      }
    }
    if (!row.museumId) return;
    const href =
      `/(museums)/${row.museumId}?highlight=${encodeURIComponent(row.checkInId)}&tab=reviews` as Href;
    router.push(href);
  };

  if (items === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center gap-3">
          <BrandActivityIndicator size="large" />
          <Text variant="muted">Loading notifications…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unread = items.filter((n) => n.readAt == null).length;
  const total = totalCount ?? items.length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="border-b border-border px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              className="p-2 active:opacity-70">
              <ArrowLeftIcon size={22} color={primaryHex} />
            </Pressable>
            <Text className="text-xl font-semibold text-foreground">Notifications</Text>
            {total > 0 ? (
              <View className="ml-1 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-semibold text-primary">{total}</Text>
              </View>
            ) : null}
          </View>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onPress={() => markAllRead({})} className="px-2">
              <Text className="text-sm text-primary">Mark all read</Text>
            </Button>
          ) : null}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-4 pb-8 pt-2 grow"
        ListEmptyComponent={
          <View className="items-center px-2 pt-12">
            <Text className="mb-2 text-center text-lg font-semibold text-foreground">No notifications yet</Text>
            <Text variant="muted" className="max-w-sm text-center text-sm leading-relaxed">
              When someone tags you in a museum check-in, you'll see it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpen(item)}
            className="mb-2 rounded-xl border border-border bg-card px-4 py-3 active:opacity-90">
            <View className="flex-row items-start justify-between gap-2">
              <Text
                className={`flex-1 text-[15px] leading-snug ${item.readAt == null ? 'font-semibold text-foreground' : 'text-foreground'}`}
                numberOfLines={3}>
                {item.bodyPreview}
              </Text>
              <Text variant="muted" className="shrink-0 text-xs">
                {formatRelative(item.createdAt)}
              </Text>
            </View>
            {item.readAt == null ? (
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
