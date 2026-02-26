import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { CalendarIcon, MapPinIcon } from 'lucide-react-native';

export type EventCardData = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  startDate: number;
  endDate: number;
  museumId?: string;
  museum?: { name: string; category: string } | null;
};

type Props = {
  event: EventCardData;
  showMuseum?: boolean;
  compactDate?: boolean;
  style?: ViewStyle;
};

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

export function EventCard({ event, showMuseum = true, compactDate = true, style }: Props) {
  const formatDate = compactDate ? formatDateCompact : formatDateFull;

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      onPress={() => event.museumId && router.push(`/${event.museumId}`)}
      disabled={!event.museumId}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{event.category}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
      {showMuseum && event.museum && (
        <View style={styles.museumRow}>
          <MapPinIcon size={12} color="#8E8E93" />
          <Text style={styles.museumName} numberOfLines={1}>{event.museum.name}</Text>
        </View>
      )}
      <View style={styles.dateRow}>
        <CalendarIcon size={12} color="#8E8E93" />
        <Text style={styles.dateText}>
          {formatDate(event.startDate)} - {formatDate(event.endDate)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardPressed: {
    backgroundColor: '#F5F5F5',
  },
  badge: {
    backgroundColor: '#34C75915',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  museumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  museumName: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
