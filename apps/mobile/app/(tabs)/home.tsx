import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { router } from 'expo-router';
import { BellIcon, InfoIcon, PlusIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import { DecorativeGradientShapes } from '@/components/decorative-gradient-shapes';
import { EventCard, EventCardData } from '@/components/event-card';
import { CheckinPost, CheckinPostData } from '@/components/checkin-post';
import { EditCheckinModal } from '@/components/edit-checkin-modal';
import { MuseumCheckinPickerModal } from '@/components/museum-checkin-picker-modal';
import { HomeFeedSection } from '@/components/home-feed-section';
import { HomeCheckinCta } from '@/components/home-checkin-cta';
import { FriendCheckinPhotosSection } from '@/components/friend-checkin-photos-section';
import { useCheckInActions } from '@/hooks/useCheckInActions';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import { useBrandPrimaryHex, useMutedForegroundHex } from '@/hooks/use-brand-primary';

function FriendsEmptyState() {
  return (
    <View className="items-center py-2">
      <Text className="text-center text-sm text-muted-foreground">
        Follow people to see their museum check-ins here.
      </Text>
      <Button className="mt-4 self-center" size="sm" onPress={() => router.push('/(tabs)/explore')}>
        <Text>Find people</Text>
      </Button>
    </View>
  );
}

function NearbyEmptyState({ message }: { message: string }) {
  return (
    <View className="py-2">
      <Text className="text-center text-sm text-muted-foreground">{message}</Text>
    </View>
  );
}

function promptEnableLocation(message: string, onRetry: () => void) {
  Alert.alert('Turn on location', message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Try again', onPress: onRetry },
    { text: 'Settings', onPress: () => Linking.openSettings() },
  ]);
}

export default function HomeScreen() {
  const brandPrimary = useBrandPrimaryHex();
  const mutedForeground = useMutedForegroundHex();
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
  const availableFeed = useQuery(
    api.events.getAvailableFeed,
    locState.status === 'unavailable' ? { itemLimit: 24 } : 'skip'
  );

  const [editingCheckin, setEditingCheckin] = useState<CheckinPostData | null>(null);
  const [museumCheckinPickerOpen, setMuseumCheckinPickerOpen] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckin(null));

  const promptLocation = useCallback(() => {
    if (locState.status !== 'unavailable') return;
    promptEnableLocation(locState.message, retry);
  }, [locState, retry]);

  const coreLoading =
    currentUser === undefined ||
    currentUserProfile === undefined ||
    followingCheckins === undefined;

  if (coreLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3">
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

  const aroundYouFeed =
    locState.status === 'ok' ? (nearbyFeed ?? []) : locState.status === 'unavailable' ? (availableFeed ?? []) : [];

  const aroundYouLoading =
    locState.status === 'pending' ||
    (locState.status === 'ok' && nearbyFeed === undefined) ||
    (locState.status === 'unavailable' && availableFeed === undefined);

  return (
    <SafeAreaView className="relative flex-1 bg-background" edges={['top', 'left', 'right']}>
      <DecorativeGradientShapes />

      <ScrollView className="z-10 flex-1" showsVerticalScrollIndicator={false}>
        <View className="pb-8">
          <View className="flex-row items-start justify-between px-5 pb-2 pt-4">
            <View className="min-w-0 flex-1">
              <Text className="mb-0.5 text-sm font-normal text-muted-foreground">Welcome</Text>
              <Text className="mb-2 text-5xl font-semibold leading-none tracking-tight text-foreground">
                {firstName}
              </Text>
            </View>
            <View className="ml-4 mt-1 flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check in at a museum"
                onPress={() => setMuseumCheckinPickerOpen(true)}
                className="p-2 active:opacity-80">
                <PlusIcon size={24} color={brandPrimary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
                className="relative p-2 active:opacity-80">
                <BellIcon size={24} color={brandPrimary} />
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
            title="From Your Friends"
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

          <FriendCheckinPhotosSection checkins={followingCheckins as CheckinPostData[]} />

          <HomeFeedSection
            title="See what's around you"
            titleAccessory={
              locState.status === 'unavailable' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="About location for nearby picks"
                  onPress={promptLocation}
                  hitSlop={8}
                  className="active:opacity-80">
                  <InfoIcon size={14} color={mutedForeground} />
                </Pressable>
              ) : null
            }
            data={aroundYouFeed}
            keyExtractor={(item) => `${item.kind ?? 'event'}-${item._id}`}
            loading={aroundYouLoading}
            onSeeAll={
              aroundYouFeed.length > 0 ? () => router.push('/home-feed/nearby') : undefined
            }
            seeAllAccessibilityLabel="See all nearby events"
            renderItem={({ item, index }) => (
              <EventCard event={item as EventCardData} cardIndex={index} layout="carousel" />
            )}
            emptyComponent={
              !aroundYouLoading && aroundYouFeed.length === 0 ? (
                <NearbyEmptyState
                  message={
                    locState.status === 'ok'
                      ? 'No upcoming events or exhibitions found near you right now.'
                      : 'No upcoming events or exhibitions right now.'
                  }
                />
              ) : null
            }
          />

          <HomeCheckinCta onPress={() => setMuseumCheckinPickerOpen(true)} />
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
