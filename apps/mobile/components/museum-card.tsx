import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { router, type Href } from 'expo-router';
import { Doc } from '@packages/backend/convex/_generated/dataModel';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CategoryTag } from '@/components/category-tag';
import { HOME_CAROUSEL_CARD_HEIGHT, HOME_CAROUSEL_CARD_WIDTH } from '@/constants/home-feed';

export type SoftwareFairBoothCardData = {
  _id: string;
  museumId?: string | null;
  boothNumber: number;
  projectName: string;
  genres: string[];
  teamMembers: string[];
  description?: string | null;
  guideUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type MuseumCardData = Doc<"museums"> & {
  averageRating?: number | null;
  ratingCount?: number;
  /** Present when the server computed distance from the viewer (meters). */
  distanceMeters?: number;
  softwareFairBooth?: SoftwareFairBoothCardData;
};

type Props = {
  museum: MuseumCardData;
  className?: string;
  /** When location is on but Convex has no geospatial pin for this museum, show an em dash. */
  expectDistance?: boolean;
  layout?: 'list' | 'carousel';
};

function museumHref(museumId: string): Href {
  return `/(museums)/${museumId}` as Href;
}

export function MuseumCard({ museum, className, expectDistance = false, layout = 'list' }: Props) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const isCarousel = layout === 'carousel';
  const booth = museum.softwareFairBooth;
  const displayName = booth?.projectName ?? museum.name;
  const primaryCategory = booth?.genres[0] ?? museum.category;
  const locationLabel = booth
    ? [
        `Booth ${booth.boothNumber}`,
        booth.teamMembers.length > 0 ? booth.teamMembers.join(', ') : museum.name,
      ].join(' · ')
    : `${museum.location?.city || 'Unknown'}, ${museum.location?.state || ''}`;
  const displayRating = museum.averageRating
    ? museum.averageRating.toFixed(1)
    : '—';
  const ratingLabel = museum.ratingCount && museum.ratingCount > 0
    ? `★ ${displayRating} (${museum.ratingCount})`
    : 'No ratings yet';
  const distanceMiles =
    typeof museum.distanceMeters === 'number' && Number.isFinite(museum.distanceMeters)
      ? museum.distanceMeters / 1609.344
      : null;
  const hasPrimaryImage = Boolean(museum.imageUrl) && !imageFailed;

  React.useEffect(() => {
    setImageFailed(false);
  }, [museum.imageUrl]);

  return (
    <Pressable
      className={cn(isCarousel ? 'active:opacity-90' : 'mx-5 mb-3 active:opacity-90', className)}
      style={isCarousel ? { width: HOME_CAROUSEL_CARD_WIDTH } : undefined}
      onPress={() =>
        router.push({
          pathname: '/(museums)/[museumId]',
          params: { museumId: museum._id },
        })
      }
    >
      <Card
        className={cn('relative overflow-hidden border-border', hasPrimaryImage && 'bg-gray-900')}
        style={isCarousel ? { height: HOME_CAROUSEL_CARD_HEIGHT } : undefined}>
        {hasPrimaryImage && (
          <>
            <Image
              source={{ uri: museum.imageUrl }}
              className="absolute inset-0 size-full"
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
            <View className="absolute inset-0 bg-black/50" />
          </>
        )}
        <CardHeader className="pb-2">
          <View className="flex-row justify-between items-start">
            <Text
              className={cn('flex-1 text-lg font-semibold leading-6', hasPrimaryImage ? 'text-white' : 'text-foreground')}
              numberOfLines={2}>
              {displayName}
            </Text>
            <View className="ml-3 items-end">
              {distanceMiles != null && (
                <Text
                  className={cn(
                    'mb-1 text-xs font-semibold',
                    hasPrimaryImage ? 'text-white/95' : 'text-foreground'
                  )}
                  accessibilityLabel={`${distanceMiles.toFixed(1)} miles away`}>
                  {distanceMiles.toFixed(1)} mi
                </Text>
              )}
              {expectDistance && distanceMiles == null && (
                <Text
                  className={cn(
                    'mb-1 text-xs font-medium',
                    hasPrimaryImage ? 'text-white/70' : 'text-muted-foreground'
                  )}
                  accessibilityLabel="Distance unavailable: museum has no map coordinates in the database yet">
                  —
                </Text>
              )}
              <CategoryTag
                category={primaryCategory}
                variant={hasPrimaryImage ? 'onImage' : 'default'}
              />
            </View>
          </View>
        </CardHeader>
        <CardContent className="pt-0">
          <Text
            className={cn('mb-3 text-sm', hasPrimaryImage ? 'text-white/90' : 'text-muted-foreground')}
            numberOfLines={isCarousel ? 2 : 1}>
            {locationLabel}
          </Text>
          <Text
            className={cn(
              'text-sm font-medium',
              hasPrimaryImage ? 'text-orange-100' : 'text-primary'
            )}>
            {ratingLabel}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}
