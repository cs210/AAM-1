import React, { useState } from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { router } from 'expo-router';
import { BellIcon, PlusIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import { DecorativeGradientShapes } from '@/components/decorative-gradient-shapes';
import { EventCard, EventCardData } from '../../components/event-card';
import { CheckinPost, CheckinPostData } from '../../components/checkin-post';
import { EditCheckinModal } from '../../components/edit-checkin-modal';
import { MuseumCheckinPickerModal } from '../../components/museum-checkin-picker-modal';
import { HomeFeedSection } from '@/components/home-feed-section';
import { useCheckInActions } from '../../hooks/useCheckInActions';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import { useUniwind } from 'uniwind';
import { RN_API_PRIMARY_DARK, RN_API_PRIMARY_LIGHT } from '@/constants/rn-api-colors';

function FriendsEmptyState() {
  return (
    <View className="border-border/60 bg-card/80 rounded-2xl border px-4 py-6">
      <Text className="text-center text-sm text-muted-foreground">
        Follow people to see their museum check-ins here.
      </Text>
      <Button className="mt-4 self-center" size="sm" onPress={() => router.push('/(tabs)/explore')}>
        <Text>Find people</Text>
      </Button>
    </View>
  );
}

function NearbyEmptyState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="border-border/60 bg-card/80 rounded-2xl border px-4 py-6">
      <Text className="text-center text-sm text-muted-foreground">{message}</Text>
      {onRetry ? (
        <View className="mt-4 flex-row justify-center gap-2">
          <Button size="sm" onPress={onRetry}>
            <Text>Try again</Text>
          </Button>
          <Pressable
            onPress={() => Linking.openSettings()}
            className="border-border rounded-lg border px-3 py-2 active:opacity-90">
            <Text className="text-xs font-semibold">Settings</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const { theme } = useUniwind();
  const primaryHex = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  const currentUserProfile = useQuery(api.userProfiles.getCurrentUserProfile);
  const followingCheckins = useQuery(api.checkIns.getFollowingCheckins);
  const unreadNotifications = useQuery(api.socialNotifications.unreadCount);
  const { locState, retry } = useViewerLocation();
  const nearbyFeed = useQuery(
    api.events.getNearbyFeed,
    locState.status === 'ok' ? { viewer: locState.viewer, itemLimit: 24 } : 'skip'
  );

  const [editingCheckin, setEditingCheckin] = useState<CheckinPostData | null>(null);
  const [museumCheckinPickerOpen, setMuseumCheckinPickerOpen] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckin(null));

  const coreLoading =
    currentUser === undefined ||
    currentUserProfile === undefined ||
    followingCheckins === undefined;

  if (coreLoading) {
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

  const nearbyLoading = locState.status === 'pending' || (locState.status === 'ok' && nearbyFeed === undefined);

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
        <View className="pb-8">
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
                accessibilityLabel="Check in at a museum"
                onPress={() => setMuseumCheckinPickerOpen(true)}
                className="p-2 active:opacity-80">
                <PlusIcon size={24} color={primaryHex} />
              </Pressable>
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
                accessibilityLabel="Open profile"
                onPress={() => router.replace('/(tabs)/profile')}
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

          <HomeFeedSection
            title="See what your friends are up to"
            subtitle="Swipe through recent check-ins"
            data={followingCheckins}
            keyExtractor={(item) => item._id}
            onSeeAll={
              followingCheckins.length > 0
                ? () => router.push('/home-feed/checkins')
                : undefined
            }
            seeAllAccessibilityLabel="See all friend check-ins"
            renderItem={({ item, index }) => (
              <CheckinPost
                checkin={item as CheckinPostData}
                cardIndex={index}
                layout="carousel"
                isOwnCheckin={currentUserId != null && item.userId === currentUserId}
                onEditPress={
                  currentUserId != null && item.userId === currentUserId
                    ? () => setEditingCheckin(item as CheckinPostData)
                    : undefined
                }
              />
            )}
            emptyComponent={<FriendsEmptyState />}
          />

          <HomeFeedSection
            title="See what's around you"
            subtitle={
              locState.status === 'ok'
                ? 'Upcoming events and exhibitions near you'
                : 'Enable location for nearby picks'
            }
            data={nearbyFeed ?? []}
            keyExtractor={(item) => `${item.kind ?? 'event'}-${item._id}`}
            loading={nearbyLoading}
            onSeeAll={
              locState.status === 'ok' && nearbyFeed && nearbyFeed.length > 0
                ? () => router.push('/home-feed/nearby')
                : undefined
            }
            seeAllAccessibilityLabel="See all nearby events"
            renderItem={({ item, index }) => (
              <EventCard event={item as EventCardData} cardIndex={index} layout="carousel" />
            )}
            emptyComponent={
              locState.status === 'unavailable' ? (
                <NearbyEmptyState message={locState.message} onRetry={retry} />
              ) : locState.status === 'ok' && nearbyFeed && nearbyFeed.length === 0 ? (
                <NearbyEmptyState message="No upcoming events or exhibitions found near you right now." />
              ) : null
            }
          />
        </View>
      </ScrollView>

      <MuseumCheckinPickerModal
        visible={museumCheckinPickerOpen}
        onClose={() => setMuseumCheckinPickerOpen(false)}
      />

      <EditCheckinModal
        visible={editingCheckin != null}
        checkInId={editingCheckin?._id as Id<'checkIns'> | null}
        museumId={
          editingCheckin?.contentType === 'museum'
            ? (editingCheckin.contentId as Id<'museums'>)
            : undefined
        }
        initialRating={editingCheckin?.rating ?? null}
        initialReview={editingCheckin?.review}
        initialImageUrls={editingCheckin?.imageUrls}
        initialImageIds={editingCheckin?.imageIds}
        initialFriendUserIds={editingCheckin?.friendUserIds}
        initialDurationHours={editingCheckin?.durationHours}
        initialVisitDate={editingCheckin?.visitDate}
        initialAttendedEventIds={editingCheckin?.attendedEventIds}
        onSave={saveCheckIn}
        onDelete={() =>
          editingCheckin && deleteCheckIn(editingCheckin._id as Id<'checkIns'>)
        }
        onClose={() => setEditingCheckin(null)}
      />
    </SafeAreaView>
  );
}
