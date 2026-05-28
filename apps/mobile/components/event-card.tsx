import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { CalendarIcon, MapPinIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { HOME_CAROUSEL_CARD_HEIGHT, HOME_CAROUSEL_CARD_WIDTH } from '@/constants/home-feed';

export type EventCardData = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  startDate?: number;
  endDate?: number;
  imageUrl?: string;
  kind?: 'event' | 'exhibition';
  museumId?: string;
  museum?: { name: string; category: string } | null;
  distanceMeters?: number;
};

type Props = {
  event: EventCardData;
  showMuseum?: boolean;
  compactDate?: boolean;
  className?: string;
  cardIndex?: number;
  layout?: 'feed' | 'carousel';
};

/** Rotating chart surfaces (tokens match web --chart-*). */
const EVENT_VARIANTS = [
  { bg: 'bg-chart-1' },
  { bg: 'bg-chart-2' },
  { bg: 'bg-chart-3' },
  { bg: 'bg-chart-4' },
  { bg: 'bg-chart-5' },
  { bg: 'bg-chart-1' },
];

function formatDateCompact(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateFull(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(
  event: Pick<EventCardData, 'startDate' | 'endDate'>,
  formatDate: (timestamp: number) => string
): string {
  if (event.startDate && event.endDate) {
    return `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
  }
  if (event.startDate) return formatDate(event.startDate);
  if (event.endDate) return formatDate(event.endDate);
  return 'Date TBA';
}

function formatDistanceMiles(distanceMeters: number | undefined): string | null {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return null;
  return `${(distanceMeters / 1609.344).toFixed(1)} mi`;
}

export function EventCard({
  event,
  showMuseum = true,
  compactDate = true,
  className,
  cardIndex = 0,
  layout = 'feed',
}: Props) {
  const isCarousel = layout === 'carousel';
  const formatDate = compactDate ? formatDateCompact : formatDateFull;
  const variant = EVENT_VARIANTS[cardIndex % EVENT_VARIANTS.length];
  const dateLabel = formatDateRange(event, formatDate);
  const showImageBackground = event.kind === 'exhibition' && Boolean(event.imageUrl);
  const textOnSurface = 'text-white';
  const badgeSurface = showImageBackground ? 'bg-white/25' : 'bg-white/20';
  const distanceLabel = formatDistanceMiles(event.distanceMeters);

  const isExhibition = event.kind === 'exhibition';
  const isPressable = isExhibition ? Boolean(event._id) : Boolean(event.museumId);

  const handlePress = () => {
    if (isExhibition) {
      const exhibitionId = event._id.startsWith('exhibition-')
        ? event._id.slice('exhibition-'.length)
        : event._id;

      router.push({
        pathname: '/(exhibitions)/[exhibitionId]',
        params: {
          exhibitionId,
          ...(event.museumId ? { museumId: event.museumId } : {}),
        },
      });
      return;
    }

    if (event.museumId) {
      router.push({
        pathname: '/(museums)/[museumId]',
        params: { museumId: event.museumId },
      });
    }
  };

  return (
    <Pressable
      className={cn(isCarousel ? 'active:opacity-90' : 'mb-4 active:opacity-90', className)}
      style={isCarousel ? { width: HOME_CAROUSEL_CARD_WIDTH } : undefined}
      onPress={handlePress}
      disabled={!isPressable}>
      <Card
        className={cn(
          'relative gap-0 overflow-hidden rounded-2xl border-0 shadow-sm shadow-black/5',
          isCarousel ? 'flex-col justify-between p-4' : 'p-5',
          variant.bg
        )}
        style={isCarousel ? { height: HOME_CAROUSEL_CARD_HEIGHT } : undefined}>
        {showImageBackground && (
          <>
            <Image
              source={{ uri: event.imageUrl }}
              className="absolute inset-0 size-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/45" />
          </>
        )}
        {isCarousel && distanceLabel ? (
          <View className="absolute right-3 top-3 z-10 rounded-full bg-black/50 px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-white">{distanceLabel}</Text>
          </View>
        ) : null}
        <View className={cn('mb-2.5 self-start rounded-xl px-2.5 py-1', badgeSurface)}>
          <Text className={cn('text-[11px] font-bold uppercase tracking-wide', textOnSurface)}>
            {event.category}
          </Text>
        </View>
        <Text
          className={cn(
            'mb-2.5 font-semibold leading-5',
            isCarousel ? 'text-[15px]' : 'mb-3 text-base leading-6',
            textOnSurface
          )}
          numberOfLines={2}>
          {event.title}
        </Text>
        {showMuseum && event.museum ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <Icon as={MapPinIcon} size={14} className="text-white opacity-90" />
            <Text className={cn('flex-1 text-sm font-medium opacity-95', textOnSurface)} numberOfLines={1}>
              {event.museum.name}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1.5">
          <Icon as={CalendarIcon} size={14} className="text-white opacity-90" />
          <Text className={cn('text-sm font-medium opacity-95', textOnSurface)}>{dateLabel}</Text>
        </View>
      </Card>
    </Pressable>
  );
}
