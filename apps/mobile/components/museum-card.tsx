import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Doc } from '@packages/backend/convex/_generated/dataModel';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type MuseumCardData = Doc<"museums"> & {
  averageRating?: number | null;
  ratingCount?: number;
  /** Present when the server computed distance from the viewer (meters). */
  distanceMeters?: number;
};

type Props = {
  museum: MuseumCardData;
  className?: string;
  /** When location is on but Convex has no geospatial pin for this museum, show an em dash. */
  expectDistance?: boolean;
};

export function MuseumCard({ museum, className, expectDistance = false }: Props) {
  const [imageFailed, setImageFailed] = React.useState(false);
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
      className={cn('mx-5 mb-3 active:opacity-90', className)}
      onPress={() => router.push(`/${museum._id}`)}
    >
      <Card className={cn('relative overflow-hidden border-[#E8E8E8]', hasPrimaryImage && 'bg-[#111827]')}>
        {hasPrimaryImage && (
          <>
            <Image
              source={{ uri: museum.imageUrl }}
              style={styles.backgroundImage}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
            <View style={styles.backgroundOverlay} />
          </>
        )}
        <CardHeader className="pb-2">
          <View className="flex-row justify-between items-start">
            <Text className={cn('text-lg font-semibold flex-1 leading-6', hasPrimaryImage ? 'text-white' : 'text-[#1A1A1A]')} numberOfLines={2}>
              {museum.name}
            </Text>
            <View className="items-end ml-3">
              {distanceMiles != null && (
                <Text
                  className={cn('text-[12px] font-semibold mb-1', hasPrimaryImage ? 'text-white/95' : 'text-[#1A1A1A]')}
                  accessibilityLabel={`${distanceMiles.toFixed(1)} miles away`}
                >
                  {distanceMiles.toFixed(1)} mi
                </Text>
              )}
              {expectDistance && distanceMiles == null && (
                <Text
                  className={cn('text-[12px] font-medium mb-1', hasPrimaryImage ? 'text-white/70' : 'text-[#9CA3AF]')}
                  accessibilityLabel="Distance unavailable: museum has no map coordinates in the database yet"
                >
                  —
                </Text>
              )}
              <View className={cn('px-2.5 py-1 rounded-lg', hasPrimaryImage ? 'bg-white/20' : 'bg-[#D4915A]/15')}>
                <Text className={cn('text-[11px] font-semibold capitalize', hasPrimaryImage ? 'text-white' : 'text-[#D4915A]')}>
                  {museum.category}
                </Text>
              </View>
            </View>
          </View>
        </CardHeader>
        <CardContent className="pt-0">
          <Text className={cn('text-sm mb-3', hasPrimaryImage ? 'text-white/90' : 'text-[#666]')}>
            {museum.location?.city || 'Unknown'}, {museum.location?.state || ''}
          </Text>
          <Text className={cn('text-[13px] font-medium', hasPrimaryImage ? 'text-[#FFD9B3]' : 'text-[#D4915A]')}>
            {ratingLabel}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
