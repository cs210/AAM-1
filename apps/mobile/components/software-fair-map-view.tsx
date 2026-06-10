import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import type { MuseumCardData, SoftwareFairBoothCardData } from '@/components/museum-card';
import { SOFTWARE_FAIR_MAP_VIEWBOX } from '@/lib/software-fair-map-layout';
import {
  SoftwareFairBoothMapSvg,
  softwareFairBoothMatchesGenre,
} from '@/components/software-fair-booth-map-svg';

type BoothMuseum = MuseumCardData & {
  softwareFairBooth: SoftwareFairBoothCardData;
};

type Props = {
  booths: MuseumCardData[];
  isLoading?: boolean;
  selectedGenre?: string | null;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.25;

function isBoothMuseum(museum: MuseumCardData): museum is BoothMuseum {
  return Boolean(museum.softwareFairBooth);
}

export function SoftwareFairMapView({ booths, isLoading = false, selectedGenre = null }: Props) {
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = React.useState(1);
  const activeBooths = React.useMemo(() => booths.filter(isBoothMuseum), [booths]);
  const mappedBooths = React.useMemo(
    () => activeBooths.map((museum) => ({ museum, booth: museum.softwareFairBooth })),
    [activeBooths]
  );

  const [selectedBoothNumber, setSelectedBoothNumber] = React.useState<number | null>(null);
  const selectedEntry =
    mappedBooths.find((entry) => entry.booth.boothNumber === selectedBoothNumber) ?? null;
  const selectedMuseum = selectedEntry?.museum ?? null;
  const selectedBooth = selectedEntry?.booth ?? null;
  const highlightedBoothCount = React.useMemo(
    () =>
      mappedBooths.filter((entry) => softwareFairBoothMatchesGenre(entry.booth, selectedGenre))
        .length,
    [mappedBooths, selectedGenre]
  );

  React.useEffect(() => {
    if (
      selectedBoothNumber != null &&
      !mappedBooths.some((entry) => entry.booth.boothNumber === selectedBoothNumber)
    ) {
      setSelectedBoothNumber(null);
    }
  }, [mappedBooths, selectedBoothNumber]);

  const baseWidth = Math.max(320, width - 32);
  const mapWidth = baseWidth * zoom;
  const mapHeight = mapWidth * (SOFTWARE_FAIR_MAP_VIEWBOX.height / SOFTWARE_FAIR_MAP_VIEWBOX.width);

  const zoomOut = React.useCallback(() => {
    setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))));
  }, []);

  const zoomIn = React.useCallback(() => {
    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))));
  }, []);

  const openSelectedBooth = React.useCallback(() => {
    if (!selectedMuseum) return;
    router.push({
      pathname: '/(museums)/[museumId]',
      params: { museumId: selectedMuseum._id },
    });
  }, [selectedMuseum]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-transparent">
        <BrandActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-3">Loading Software Fair map...</Text>
      </View>
    );
  }

  if (activeBooths.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-transparent px-8">
        <Text className="text-muted-foreground text-center text-base">
          No active Software Fair booths are assigned yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-transparent" style={{ flex: 1 }}>
      <View className="border-border/70 bg-card/70 mx-4 mt-2 rounded-2xl border px-4 py-3 shadow-sm shadow-black/5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-foreground text-sm font-semibold">CoDa B80 Booth Map</Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {selectedGenre
                ? `${highlightedBoothCount} ${selectedGenre} booth${highlightedBoothCount === 1 ? '' : 's'} highlighted.`
                : 'Drag to pan. Use zoom for table numbers and tap a booth for details.'}
            </Text>
          </View>
          <View className="border-border bg-card flex-row items-center rounded-full border">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out Software Fair map"
              disabled={zoom <= MIN_ZOOM}
              onPress={zoomOut}
              className="px-3 py-1.5 active:opacity-75 disabled:opacity-40">
              <Text className="text-primary text-base font-semibold">-</Text>
            </Pressable>
            <Text className="text-muted-foreground min-w-[44px] text-center text-xs font-semibold">
              {Math.round(zoom * 100)}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in Software Fair map"
              disabled={zoom >= MAX_ZOOM}
              onPress={zoomIn}
              className="px-3 py-1.5 active:opacity-75 disabled:opacity-40">
              <Text className="text-primary text-base font-semibold">+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" style={{ flex: 1 }} showsVerticalScrollIndicator>
        <ScrollView
          horizontal
          bounces
          showsHorizontalScrollIndicator
          contentContainerStyle={{ padding: 16 }}>
          <View
            className="border-border bg-card overflow-hidden rounded-2xl border"
            style={{ width: mapWidth, height: mapHeight }}>
            <SoftwareFairBoothMapSvg
              booths={mappedBooths.map(({ booth }) => booth)}
              width={mapWidth}
              height={mapHeight}
              accessibilityLabel="CoDa B80 Software Fair booth map"
              selectedBoothNumber={selectedBoothNumber}
              selectedGenre={selectedGenre}
              onBoothPress={setSelectedBoothNumber}
            />
          </View>
        </ScrollView>
      </ScrollView>

      <View className="border-border/70 bg-card/70 mx-4 mb-3 rounded-2xl border px-4 py-3 shadow-sm shadow-black/5">
        {selectedBooth && selectedMuseum ? (
          <View className="gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-primary text-xs font-semibold tracking-wide uppercase">
                  Booth {selectedBooth.boothNumber}
                </Text>
                <Text numberOfLines={1} className="text-foreground mt-0.5 text-base font-semibold">
                  {selectedBooth.projectName}
                </Text>
                <Text numberOfLines={1} className="text-muted-foreground mt-0.5 text-xs">
                  {selectedBooth.teamMembers.length > 0
                    ? selectedBooth.teamMembers.join(', ')
                    : selectedMuseum.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View booth ${selectedBooth.boothNumber} details`}
                onPress={openSelectedBooth}
                className="bg-primary rounded-full px-4 py-2 active:opacity-80">
                <Text className="text-primary-foreground text-xs font-semibold">View</Text>
              </Pressable>
            </View>
            {selectedBooth.genres.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5">
                {selectedBooth.genres.slice(0, 3).map((genre) => (
                  <View key={genre} className="bg-muted rounded-full px-2 py-1">
                    <Text className="text-muted-foreground text-[11px] font-medium">{genre}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text className="text-muted-foreground text-center text-sm">
            {selectedGenre
              ? `Tap a highlighted ${selectedGenre} booth, or any booth number, to preview it.`
              : 'Tap a booth number to preview its team.'}
          </Text>
        )}
      </View>
    </View>
  );
}
