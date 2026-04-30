import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { router } from 'expo-router';
import { BellIcon, ScanSearchIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { FeedEmptyState } from '@/components/feed-empty-state';
import { DecorativeGradientShapes } from '@/components/decorative-gradient-shapes';
import { EventCard, EventCardData } from '../../components/event-card';
import { CheckinPostData } from '../../components/checkin-post';
import { CheckinPostWithBookmark } from '../../components/checkin-post-with-bookmark';
import { EditCheckinModal } from '../../components/edit-checkin-modal';
import { useCheckInActions } from '../../hooks/useCheckInActions';
import { useUniwind } from 'uniwind';
import { RN_API_PRIMARY_DARK, RN_API_PRIMARY_LIGHT } from '@/constants/rn-api-colors';

export default function HomeScreen() {
  const { theme } = useUniwind();
  const primaryHex = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  const currentUserProfile = useQuery(api.userProfiles.getCurrentUserProfile);
  const events = useQuery(api.events.getUnifiedFeed);
  const followingCheckins = useQuery(api.checkIns.getFollowingCheckins);
  const unreadNotifications = useQuery(api.socialNotifications.unreadCount);
  const [editingCheckin, setEditingCheckin] = useState<CheckinPostData | null>(null);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckin(null));

  if (
    events === undefined ||
    followingCheckins === undefined ||
    currentUser === undefined ||
    currentUserProfile === undefined
  ) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-3" style={{ flex: 1 }}>
          <BrandActivityIndicator size="large" />
          <Text variant="muted" className="text-base">
            Loading feed...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = currentUser?.name?.split(' ')[0] || 'there';
  const initial = firstName.charAt(0).toUpperCase();

  const feedItems = [
    ...events.map((e) => ({ type: 'event' as const, data: e })),
    ...followingCheckins.map((c) => ({ type: 'checkin' as const, data: c })),
  ].sort((a, b) => {
    const dateA = a.type === 'event' ? a.data._creationTime : a.data.createdAt;
    const dateB = b.type === 'event' ? b.data._creationTime : b.data.createdAt;
    return dateB - dateA;
  });

  return (
    <SafeAreaView
      className="relative flex-1 bg-background"
      style={{ flex: 1 }}
      edges={['top', 'left', 'right']}>
      <DecorativeGradientShapes />

      <ScrollView
        className="z-10 flex-1"
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}>
        <View className="pb-3">
          <View className="flex-row items-start justify-between px-5 pb-2 pt-4">
            <View className="min-w-0 flex-1">
              <Text className="mb-0.5 text-sm font-normal text-muted-foreground">Welcome</Text>
              <Text className="mb-2 text-5xl font-semibold leading-none tracking-tight text-foreground">
                {firstName}
              </Text>
              <Separator className="mt-2 max-w-3/5 self-start bg-border" />
            </View>
            <View className="ml-4 mt-1 flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
                className="relative p-2 active:opacity-80">
                <BellIcon size={24} color={primaryHex} />
                {unreadNotifications != null && unreadNotifications > 0 ? (
                  <View className="absolute right-1 top-1 min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1">
                    <Text className="text-[10px] font-bold text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open visual search"
                onPress={() => router.push('/visual-search')}
                className="size-10 items-center justify-center rounded-full border border-border bg-card active:opacity-80">
                <ScanSearchIcon size={20} color={primaryHex} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() => router.push('/(tabs)/profile')}
                className="active:opacity-80">
                <Avatar className="size-10" alt="Your profile">
                  {currentUserProfile?.imageUrl ? (
                    <AvatarImage source={{ uri: currentUserProfile.imageUrl }} />
                  ) : null}
                  <AvatarFallback className="bg-primary">
                    <Text className="text-base font-bold text-primary-foreground">{initial}</Text>
                  </AvatarFallback>
                </Avatar>
              </Pressable>
            </View>
          </View>

          <Text className="mb-4 px-5 text-sm font-normal text-muted-foreground">
            see what your friends are up to
          </Text>

        <View className="px-5 pb-2">
          {feedItems.length === 0 ? (
            <FeedEmptyState />
          ) : (
            <View>
              {feedItems.map((item, index) =>
                item.type === 'event' ? (
                  <EventCard
                    key={`event-${item.data._id}`}
                    event={item.data as EventCardData}
                    cardIndex={index}
                  />
                ) : (
                  <CheckinPostWithBookmark
                    key={`checkin-${item.data._id}`}
                    checkin={item.data as CheckinPostData}
                    cardIndex={index}
                    isOwnCheckin={
                      currentUserId != null && (item.data as CheckinPostData).userId === currentUserId
                    }
                    onEditPress={
                      currentUserId != null && (item.data as CheckinPostData).userId === currentUserId
                        ? () => setEditingCheckin(item.data as CheckinPostData)
                        : undefined
                    }
                  />
                )
              )}
            </View>
          )}
        </View>
        </View>
      </ScrollView>

      <EditCheckinModal
        visible={editingCheckin != null}
        initialRating={editingCheckin?.rating ?? null}
        initialReview={editingCheckin?.review}
        onSave={(rating, review) =>
          editingCheckin && saveCheckIn(editingCheckin._id as Id<'checkIns'>, rating, review)
        }
        onDelete={() =>
          editingCheckin && deleteCheckIn(editingCheckin._id as Id<'checkIns'>)
        }
        onClose={() => setEditingCheckin(null)}
      />
    </SafeAreaView>
  );
}
