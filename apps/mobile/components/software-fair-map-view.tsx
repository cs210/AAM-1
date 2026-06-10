import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, {
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import type { MuseumCardData, SoftwareFairBoothCardData } from '@/components/museum-card';
import {
  SOFTWARE_FAIR_BOOTH_COORDINATES,
  SOFTWARE_FAIR_GENRE_COLORS,
  SOFTWARE_FAIR_MAP_VIEWBOX,
  SOFTWARE_FAIR_ROOM_PATH,
  type SoftwareFairBoothMapCoordinate,
} from '@/lib/software-fair-map-layout';

type BoothMuseum = MuseumCardData & {
  softwareFairBooth: SoftwareFairBoothCardData;
};

type Props = {
  booths: MuseumCardData[];
  isLoading?: boolean;
};

const TABLE_WIDTH = 55;
const TABLE_HEIGHT = 35;
const HIT_WIDTH = 72;
const HIT_HEIGHT = 52;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.25;

function isBoothMuseum(museum: MuseumCardData): museum is BoothMuseum {
  return Boolean(museum.softwareFairBooth);
}

function normalizeGenre(value: string | undefined) {
  if (!value) return 'Other';
  return value.trim() || 'Other';
}

function colorForBooth(booth: SoftwareFairBoothCardData) {
  const primaryGenre = normalizeGenre(booth.genres[0]);
  return SOFTWARE_FAIR_GENRE_COLORS[primaryGenre] ?? SOFTWARE_FAIR_GENRE_COLORS.Other;
}

function contrastTextColor(hexColor: string) {
  const raw = hexColor.replace('#', '');
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#111827' : '#FFFFFF';
}

function buildCoordinateMap() {
  return new Map(SOFTWARE_FAIR_BOOTH_COORDINATES.map((coord) => [coord.boothNumber, coord]));
}

const BOOTH_COORDINATE_BY_NUMBER = buildCoordinateMap();

export function SoftwareFairMapView({ booths, isLoading = false }: Props) {
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = React.useState(1);
  const activeBooths = React.useMemo(() => booths.filter(isBoothMuseum), [booths]);
  const mappedBooths = React.useMemo(
    () =>
      activeBooths
        .map((museum) => {
          const booth = museum.softwareFairBooth;
          const coordinate = BOOTH_COORDINATE_BY_NUMBER.get(booth.boothNumber);
          return coordinate ? { museum, booth, coordinate } : null;
        })
        .filter(
          (
            entry
          ): entry is {
            museum: BoothMuseum;
            booth: SoftwareFairBoothCardData;
            coordinate: SoftwareFairBoothMapCoordinate;
          } => entry !== null
        ),
    [activeBooths]
  );

  const [selectedBoothNumber, setSelectedBoothNumber] = React.useState<number | null>(null);
  const selectedEntry =
    mappedBooths.find((entry) => entry.booth.boothNumber === selectedBoothNumber) ?? null;
  const selectedMuseum = selectedEntry?.museum ?? null;
  const selectedBooth = selectedEntry?.booth ?? null;

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
      <View className="flex-1 items-center justify-center">
        <BrandActivityIndicator size="large" />
        <Text className="mt-3 text-muted-foreground">Loading Software Fair map...</Text>
      </View>
    );
  }

  if (activeBooths.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-muted-foreground">
          No active Software Fair booths are assigned yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <View className="border-b border-border/70 px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-foreground">CoDa B80 Booth Map</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              Drag to pan. Use zoom for table numbers and tap a booth for details.
            </Text>
          </View>
          <View className="flex-row items-center rounded-full border border-border bg-card">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out Software Fair map"
              disabled={zoom <= MIN_ZOOM}
              onPress={zoomOut}
              className="px-3 py-1.5 active:opacity-75 disabled:opacity-40">
              <Text className="text-base font-semibold text-primary">-</Text>
            </Pressable>
            <Text className="min-w-[44px] text-center text-xs font-semibold text-muted-foreground">
              {Math.round(zoom * 100)}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in Software Fair map"
              disabled={zoom >= MAX_ZOOM}
              onPress={zoomIn}
              className="px-3 py-1.5 active:opacity-75 disabled:opacity-40">
              <Text className="text-base font-semibold text-primary">+</Text>
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
            className="overflow-hidden rounded-2xl border border-border bg-card"
            style={{ width: mapWidth, height: mapHeight }}>
            <Svg
              width={mapWidth}
              height={mapHeight}
              viewBox={`${SOFTWARE_FAIR_MAP_VIEWBOX.x} ${SOFTWARE_FAIR_MAP_VIEWBOX.y} ${SOFTWARE_FAIR_MAP_VIEWBOX.width} ${SOFTWARE_FAIR_MAP_VIEWBOX.height}`}
              accessibilityLabel="CoDa B80 Software Fair booth map">
              <Defs>
                <ClipPath id="software-fair-room-clip">
                  <Path d={SOFTWARE_FAIR_ROOM_PATH} />
                </ClipPath>
              </Defs>

              <Rect
                x={SOFTWARE_FAIR_MAP_VIEWBOX.x}
                y={SOFTWARE_FAIR_MAP_VIEWBOX.y}
                width={SOFTWARE_FAIR_MAP_VIEWBOX.width}
                height={SOFTWARE_FAIR_MAP_VIEWBOX.height}
                fill="#F4F5F7"
              />
              <G clipPath="url(#software-fair-room-clip)">
                <Path d={SOFTWARE_FAIR_ROOM_PATH} fill="#FAFBFC" />
                <G opacity={0.42}>
                  <Rect x={68} y={366.5} width={164} height={11} fill="#94A3B8" transform="rotate(20 150 372)" />
                  <Rect x={66.85} y={507.5} width={164} height={11} fill="#94A3B8" transform="rotate(20 148.85 513)" />
                  <Rect x={103} y={295.5} width={135.5} height={11} fill="#94A3B8" transform="rotate(20 170.75 301)" />
                  <Rect x={235} y={319} width={337} height={11} fill="#94A3B8" />
                  <Rect x={225} y={393.5} width={367} height={11} fill="#94A3B8" />
                  <Rect x={225} y={536.5} width={347} height={11} fill="#94A3B8" />
                  <Rect x={564} y={296.5} width={135.5} height={11} fill="#94A3B8" transform="rotate(-20 631.75 302)" />
                  <Rect x={582} y={370.5} width={135.5} height={11} fill="#94A3B8" transform="rotate(-20 649.75 376)" />
                  <Rect x={563.71} y={502.18} width={192.1} height={11} fill="#94A3B8" transform="rotate(-20 659.76 507.68)" />
                  <Rect x={421} y={382.5} width={305} height={11} fill="#94A3B8" transform="rotate(-90 573.5 388)" />
                  <Rect x={77.85} y={386.5} width={305} height={11} fill="#94A3B8" transform="rotate(-90 230.35 392)" />
                </G>
                <Rect x={142} y={94} width={540} height={58} fill="#EEF1F5" stroke="#CBD5E1" strokeWidth={1} rx={6} />
                <SvgText
                  x={412}
                  y={126}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize={12}
                  fontWeight="700">
                  STAGE
                </SvgText>
              </G>
              <Path
                d={SOFTWARE_FAIR_ROOM_PATH}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth={2}
                strokeLinejoin="miter"
              />

              {mappedBooths.map(({ museum, booth, coordinate }) => {
                const isSelected = selectedBoothNumber === booth.boothNumber;
                const fill = colorForBooth(booth);
                const textFill = contrastTextColor(fill);
                return (
                  <G
                    key={`${museum._id}-${booth.boothNumber}`}
                    opacity={1}
                    onPress={() => setSelectedBoothNumber(booth.boothNumber)}>
                    <G transform={`translate(${coordinate.x} ${coordinate.y}) rotate(${coordinate.rotate})`}>
                      <Rect
                        x={-HIT_WIDTH / 2}
                        y={-HIT_HEIGHT / 2}
                        width={HIT_WIDTH}
                        height={HIT_HEIGHT}
                        fill="transparent"
                      />
                      <Rect
                        x={-TABLE_WIDTH / 2}
                        y={-TABLE_HEIGHT / 2}
                        width={TABLE_WIDTH}
                        height={TABLE_HEIGHT}
                        rx={5}
                        fill={fill}
                        stroke={isSelected ? '#111827' : 'rgba(255,255,255,0.65)'}
                        strokeWidth={isSelected ? 4 : 1.5}
                      />
                    </G>
                    <SvgText
                      x={coordinate.x}
                      y={coordinate.y + 1}
                      textAnchor="middle"
                      fill={textFill}
                      fontSize={16}
                      fontWeight="700">
                      {String(booth.boothNumber)}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
        </ScrollView>
      </ScrollView>

      <View className="border-t border-border bg-background px-4 py-3">
        {selectedBooth && selectedMuseum ? (
          <View className="gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Booth {selectedBooth.boothNumber}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-base font-semibold text-foreground">
                  {selectedBooth.projectName}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
                  {selectedBooth.teamMembers.length > 0
                    ? selectedBooth.teamMembers.join(', ')
                    : selectedMuseum.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View booth ${selectedBooth.boothNumber} details`}
                onPress={openSelectedBooth}
                className="rounded-full bg-primary px-4 py-2 active:opacity-80">
                <Text className="text-xs font-semibold text-primary-foreground">View</Text>
              </Pressable>
            </View>
            {selectedBooth.genres.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5">
                {selectedBooth.genres.slice(0, 3).map((genre) => (
                  <View key={genre} className="rounded-full bg-muted px-2 py-1">
                    <Text className="text-[11px] font-medium text-muted-foreground">{genre}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text className="text-center text-sm text-muted-foreground">
            Tap a booth number to preview its team.
          </Text>
        )}
      </View>
    </View>
  );
}
