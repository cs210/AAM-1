import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Doc } from '@packages/backend/convex/_generated/dataModel';

export type MuseumCardData = Doc<"museums">;

type Props = {
  museum: MuseumCardData;
  style?: ViewStyle;
};

export function MuseumCard({ museum, style }: Props) {
  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      onPress={() => router.push(`/${museum._id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.museumName} numberOfLines={2}>{museum.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{museum.category}</Text>
        </View>
      </View>
      <Text style={styles.museumLocation}>
        {museum.location?.city || 'Unknown'}, {museum.location?.state || ''}
      </Text>
      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>★ 4.5 Rating</Text>
        <Text style={styles.detailText}>📸 245 Photos</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardPressed: {
    backgroundColor: '#F5F5F5',
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  museumName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'PublicSans',
    flex: 1,
  },
  museumLocation: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'PublicSans',
    marginBottom: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'PublicSans',
  },
});
