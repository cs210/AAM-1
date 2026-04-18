import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { CalendarIcon, MapPinIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
};

type Props = {
  event: EventCardData;
  showMuseum?: boolean;
  compactDate?: boolean;
  className?: string;
  cardIndex?: number;
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

export function EventCard({
  event,
  showMuseum = true,
  compactDate = true,
  className,
  cardIndex = 0,
}: Props) {
  const formatDate = compactDate ? formatDateCompact : formatDateFull;
  const variant = EVENT_VARIANTS[cardIndex % EVENT_VARIANTS.length];
  const dateLabel = formatDateRange(event, formatDate);
  const showImageBackground = event.kind === 'exhibition' && Boolean(event.imageUrl);
  const textOnSurface = 'text-white';
  const badgeSurface = showImageBackground ? 'bg-white/25' : 'bg-white/20';
  const iconColor = '#FFFFFF';

  return (
    <Pressable
      className={cn('mb-4 active:opacity-90', className)}
      onPress={() => event.museumId && router.push(`/${event.museumId}`)}
      disabled={!event.museumId}>
      <Card
        className={cn(
          'relative gap-0 overflow-hidden rounded-2xl border-0 p-5 shadow-sm shadow-black/5',
          variant.bg
        )}>
        {showImageBackground && (
          <>
            <Image
              source={{ uri: event.imageUrl }}
              className="absolute inset-0 h-full w-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/45" />
          </>
        )}
        <View className={cn('mb-3 self-start rounded-xl px-3 py-1.5', badgeSurface)}>
          <Text className={cn('text-xs font-bold uppercase tracking-wide', textOnSurface)}>
            {event.category}
          </Text>
        </View>
        <Text className={cn('mb-3 text-base font-semibold leading-6', textOnSurface)} numberOfLines={2}>
          {event.title}
        </Text>
        {showMuseum && event.museum && (
          <View className="mb-2 flex-row items-center gap-1.5">
            <MapPinIcon size={14} color={iconColor} style={{ opacity: 0.9 }} />
            <Text className={cn('flex-1 text-sm font-medium opacity-95', textOnSurface)} numberOfLines={1}>
              {event.museum.name}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-1.5">
          <CalendarIcon size={14} color={iconColor} style={{ opacity: 0.9 }} />
          <Text className={cn('text-sm font-medium opacity-95', textOnSurface)}>{dateLabel}</Text>
        </View>
      </Card>
    </Pressable>
  );
}
