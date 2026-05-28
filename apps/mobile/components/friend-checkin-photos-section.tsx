import React, { useMemo } from 'react';
import { View, Pressable, Image, useWindowDimensions, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { HomeSectionShell, HOME_SECTION_INSET } from '@/components/home-feed-section';
import type { CheckinPostData } from '@/components/checkin-post';
import { openCheckinReview } from '@/lib/checkin-navigation';

const SNAPSHOT_PHOTO_COUNT = 3;
const GRID_GAP = 6;
const TILE_RADIUS = 12;

export type FriendCheckinPhotoItem = {
  key: string;
  imageUrl: string;
  checkin: CheckinPostData;
  sortTime: number;
};

function flattenCheckinPhotos(checkins: CheckinPostData[]): FriendCheckinPhotoItem[] {
  const items: FriendCheckinPhotoItem[] = [];

  for (const checkin of checkins) {
    if (!checkin.imageUrls?.length) continue;
    const sortTime = checkin.visitDate ?? checkin.createdAt;

    for (const [index, imageUrl] of checkin.imageUrls.entries()) {
      items.push({
        key: `${checkin._id}-${index}`,
        imageUrl,
        checkin,
        sortTime,
      });
    }
  }

  return items.sort((a, b) => b.sortTime - a.sortTime);
}

/** Pick 3 recent photos, preferring one per user before filling duplicates. */
export function selectSnapshotPhotos(checkins: CheckinPostData[]): FriendCheckinPhotoItem[] {
  const sorted = flattenCheckinPhotos(checkins);
  const selected: FriendCheckinPhotoItem[] = [];
  const usedKeys = new Set<string>();
  const usedUsers = new Set<string>();

  for (const item of sorted) {
    if (selected.length >= SNAPSHOT_PHOTO_COUNT) break;
    if (usedUsers.has(item.checkin.userId)) continue;
    usedUsers.add(item.checkin.userId);
    usedKeys.add(item.key);
    selected.push(item);
  }

  for (const item of sorted) {
    if (selected.length >= SNAPSHOT_PHOTO_COUNT) break;
    if (usedKeys.has(item.key)) continue;
    selected.push(item);
    usedKeys.add(item.key);
  }

  return selected;
}

type SnapshotTileProps = {
  item: FriendCheckinPhotoItem;
  style: ViewStyle;
};

function SnapshotTile({ item, style }: SnapshotTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${item.checkin.userName}'s review at ${item.checkin.contentName}`}
      onPress={() => openCheckinReview(item.checkin)}
      style={[{ overflow: 'hidden', borderRadius: TILE_RADIUS, borderCurve: 'continuous' }, style]}
      className="bg-muted active:opacity-90">
      <Image source={{ uri: item.imageUrl }} className="size-full" resizeMode="cover" />
    </Pressable>
  );
}

function SnapshotGrid({ photos }: { photos: FriendCheckinPhotoItem[] }) {
  const { width: screenWidth } = useWindowDimensions();
  const gridWidth = screenWidth - HOME_SECTION_INSET * 2;
  const leftWidth = (gridWidth - GRID_GAP) * (2 / 3);
  const rightWidth = gridWidth - GRID_GAP - leftWidth;
  const stackHeight = (leftWidth - GRID_GAP) / 2;

  return (
    <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
      <SnapshotTile item={photos[0]} style={{ width: leftWidth, height: leftWidth }} />
      <View style={{ gap: GRID_GAP }}>
        <SnapshotTile item={photos[1]} style={{ width: rightWidth, height: stackHeight }} />
        <SnapshotTile item={photos[2]} style={{ width: rightWidth, height: stackHeight }} />
      </View>
    </View>
  );
}

type Props = {
  checkins: CheckinPostData[];
};

export function FriendCheckinPhotosSection({ checkins }: Props) {
  const photos = useMemo(() => selectSnapshotPhotos(checkins), [checkins]);

  if (photos.length < SNAPSHOT_PHOTO_COUNT) return null;

  return (
    <HomeSectionShell
      header={
        <Text className="text-lg font-semibold text-foreground">Snapshot From Friends</Text>
      }>
      <View className="mt-4 px-5">
        <SnapshotGrid photos={photos} />
      </View>
    </HomeSectionShell>
  );
}
