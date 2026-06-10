import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Doc } from '@packages/backend/convex/_generated/dataModel';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CategoryTag } from '@/components/category-tag';
import { HOME_CAROUSEL_CARD_HEIGHT, HOME_CAROUSEL_CARD_WIDTH } from '@/constants/home-feed';
import {
  getSoftwareFairCardPalette,
  SOFTWARE_FAIR_GRADIENT_END,
  SOFTWARE_FAIR_GRADIENT_START,
} from '@/lib/software-fair-card-style';

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

export type MuseumCardData = Doc<'museums'> & {
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

function compactLabels(labels: string[], limit: number) {
  const visible = labels.filter((label) => label.trim().length > 0).slice(0, limit);
  const hiddenCount = Math.max(0, labels.length - visible.length);
  return hiddenCount > 0 ? [...visible, `+${hiddenCount}`] : visible;
}

export function MuseumCard({ museum, className, expectDistance = false, layout = 'list' }: Props) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const isCarousel = layout === 'carousel';
  const booth = museum.softwareFairBooth;
  const isBoothCard = booth != null;
  const boothPalette = booth ? getSoftwareFairCardPalette(booth.boothNumber) : null;
  const displayName = booth?.projectName ?? museum.name;
  const primaryCategory = booth?.genres[0] ?? museum.category;
  const locationLabel = `${museum.location?.city || 'Unknown'}, ${museum.location?.state || ''}`;
  const displayRating = museum.averageRating ? museum.averageRating.toFixed(1) : '—';
  const ratingLabel =
    museum.ratingCount && museum.ratingCount > 0
      ? `★ ${displayRating} (${museum.ratingCount})`
      : 'No ratings yet';
  const boothRatingLabel =
    museum.ratingCount && museum.ratingCount > 0
      ? `★ ${displayRating} app rating`
      : 'View booth details';
  const distanceMiles =
    typeof museum.distanceMeters === 'number' && Number.isFinite(museum.distanceMeters)
      ? museum.distanceMeters / 1609.344
      : null;
  const hasPrimaryImage = Boolean(museum.imageUrl) && !imageFailed;
  const usesBoothGradient = isBoothCard && !hasPrimaryImage && boothPalette != null;
  const textOnVisualSurface = hasPrimaryImage || usesBoothGradient;
  const boothLabels = booth ? compactLabels(booth.genres, isCarousel ? 2 : 3) : [];

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
      }>
      <Card
        className={cn(
          'border-border relative overflow-hidden',
          hasPrimaryImage && 'bg-gray-900',
          usesBoothGradient && 'border-white/10 bg-transparent',
          isBoothCard && 'gap-0 rounded-2xl py-0 shadow-sm shadow-black/10'
        )}
        style={isCarousel ? { height: HOME_CAROUSEL_CARD_HEIGHT } : undefined}>
        {usesBoothGradient && boothPalette ? (
          <>
            <LinearGradient
              colors={boothPalette.gradient}
              start={SOFTWARE_FAIR_GRADIENT_START}
              end={SOFTWARE_FAIR_GRADIENT_END}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" className="absolute inset-0 bg-black/10" />
            <View
              pointerEvents="none"
              className="absolute top-0 left-0 h-full w-1"
              style={{ backgroundColor: boothPalette.accent }}
            />
          </>
        ) : null}
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
        {isBoothCard ? (
          <View className={cn(isCarousel ? 'h-full justify-between p-4' : 'p-5')}>
            <View>
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <View className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
                  <Text
                    className={cn(
                      'text-[11px] font-semibold uppercase',
                      textOnVisualSurface ? 'text-white/85' : 'text-muted-foreground'
                    )}
                    numberOfLines={1}>
                    Booth {booth.boothNumber}
                  </Text>
                </View>
                {museum.ratingCount && museum.ratingCount > 0 ? (
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      textOnVisualSurface ? 'text-white/85' : 'text-primary'
                    )}
                    numberOfLines={1}>
                    ★ {displayRating}
                  </Text>
                ) : null}
              </View>
              <Text
                className={cn(
                  'text-lg leading-6 font-semibold',
                  textOnVisualSurface ? 'text-white' : 'text-foreground'
                )}
                numberOfLines={isCarousel ? 2 : 3}>
                {displayName}
              </Text>
              {boothLabels.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {boothLabels.map((label) => (
                    <View
                      key={label}
                      className={cn(
                        'rounded-full border px-2 py-1',
                        textOnVisualSurface
                          ? 'border-white/15 bg-white/10'
                          : 'border-border bg-muted'
                      )}>
                      <Text
                        className={cn(
                          'text-[11px] font-medium',
                          textOnVisualSurface ? 'text-white/85' : 'text-muted-foreground'
                        )}
                        numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <Text
              className={cn(
                'mt-3 text-sm font-medium',
                textOnVisualSurface ? 'text-white/75' : 'text-primary'
              )}
              numberOfLines={1}>
              {boothRatingLabel}
            </Text>
          </View>
        ) : (
          <>
            <CardHeader className="pb-2">
              <View className="flex-row items-start justify-between">
                <Text
                  className={cn(
                    'flex-1 text-lg leading-6 font-semibold',
                    hasPrimaryImage ? 'text-white' : 'text-foreground'
                  )}
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
                className={cn(
                  'mb-3 text-sm',
                  hasPrimaryImage ? 'text-white/90' : 'text-muted-foreground'
                )}
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
          </>
        )}
      </Card>
    </Pressable>
  );
}
