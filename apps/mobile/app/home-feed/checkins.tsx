import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { CheckinPost, CheckinPostData } from '@/components/checkin-post';
import { EditCheckinModal } from '@/components/edit-checkin-modal';
import { FeedEmptyState } from '@/components/feed-empty-state';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { useCheckInActions } from '@/hooks/useCheckInActions';

export default function AllCheckinsScreen() {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  const followingCheckins = useQuery(api.checkIns.getFollowingCheckins);
  const [editingCheckin, setEditingCheckin] = useState<CheckinPostData | null>(null);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckin(null));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <ScreenTitleBar
          title="Where have your friends been?"
          onBackPress={() => router.back()}
        />
        {followingCheckins === undefined || currentUser === undefined ? (
          <View className="flex-1 items-center justify-center gap-3">
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="text-base">
              Loading check-ins...
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
            {followingCheckins.length === 0 ? (
              <FeedEmptyState />
            ) : (
              followingCheckins.map((checkin, index) => (
                <CheckinPost
                  key={checkin._id}
                  checkin={checkin as CheckinPostData}
                  cardIndex={index}
                  layout="feed"
                  isOwnCheckin={
                    currentUserId != null && (checkin as CheckinPostData).userId === currentUserId
                  }
                  onEditPress={
                    currentUserId != null && (checkin as CheckinPostData).userId === currentUserId
                      ? () => setEditingCheckin(checkin as CheckinPostData)
                      : undefined
                  }
                />
              ))
            )}
          </ScrollView>
        )}

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
    </>
  );
}
