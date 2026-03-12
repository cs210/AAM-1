import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { CalendarIcon, MapPinIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
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

const EVENT_COLORS = [
  { bg: 'bg-[#C8A882]', text: 'text-white', badgeBg: 'bg-white/25' },
  { bg: 'bg-[#6B9BD1]', text: 'text-white', badgeBg: 'bg-white/25' },
  { bg: 'bg-[#B8956A]', text: 'text-white', badgeBg: 'bg-white/25' },
  { bg: 'bg-[#7FB87F]', text: 'text-white', badgeBg: 'bg-white/25' },
  { bg: 'bg-[#C98BA6]', text: 'text-white', badgeBg: 'bg-white/25' },
  { bg: 'bg-[#9B9BCE]', text: 'text-white', badgeBg: 'bg-white/25' },
];

const COLOR_VALUES = [
  '#FFFFFF',
  '#FFFFFF',
  '#FFFFFF',
  '#FFFFFF',
  '#FFFFFF',
  '#FFFFFF',
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

export function EventCard({ event, showMuseum = true, compactDate = true, className, cardIndex = 0 }: Props) {
  const formatDate = compactDate ? formatDateCompact : formatDateFull;
  const colorScheme = EVENT_COLORS[cardIndex % EVENT_COLORS.length];
  const iconColor = COLOR_VALUES[cardIndex % COLOR_VALUES.length];
  const dateLabel = formatDateRange(event, formatDate);
  const showImageBackground = event.kind === 'exhibition' && Boolean(event.imageUrl);

  return (
    <Pressable 
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 mb-4 shadow-sm shadow-black/5 active:opacity-90',
        colorScheme.bg,
        className
      )}
      onPress={() => event.museumId && router.push(`/${event.museumId}`)}
      disabled={!event.museumId}
    >
      {showImageBackground && (
        <>
          <Image source={{ uri: event.imageUrl }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
          <View className="absolute inset-0 bg-black/45" />
        </>
      )}
      <View className={cn('px-3 py-1.5 rounded-xl self-start mb-3', colorScheme.badgeBg)}>
        <Text className={cn('text-xs font-bold uppercase tracking-wide', colorScheme.text)}>
          {event.category}
        </Text>
      </View>
      <Text className={cn('text-base font-semibold mb-3 leading-6', colorScheme.text)} numberOfLines={2}>
        {event.title}
      </Text>
      {showMuseum && event.museum && (
        <View className="flex-row items-center gap-1.5 mb-2">
          <MapPinIcon size={14} color={iconColor} style={{ opacity: 0.9 }} />
          <Text className={cn('text-sm font-medium flex-1 opacity-95', colorScheme.text)} numberOfLines={1}>
            {event.museum.name}
          </Text>
        </View>
      )}
      <View className="flex-row items-center gap-1.5">
        <CalendarIcon size={14} color={iconColor} style={{ opacity: 0.9 }} />
        <Text className={cn('text-sm font-medium opacity-95', colorScheme.text)}>
          {dateLabel}
        </Text>
      </View>
    </Pressable>
  );
}
