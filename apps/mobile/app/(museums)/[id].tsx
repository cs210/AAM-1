import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { ArrowLeftIcon, MapPinIcon, HeartIcon } from 'lucide-react-native';
import { EventCard, EventCardData } from '../../components/event-card';

export default function MuseumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // Fetch museum from Convex
  const museum = useQuery(api.museums.getMuseum, 
    id ? { id: id as Id<"museums"> } : "skip"
  );
  
  // Fetch events for this museum
  const events = useQuery(api.events.getEventsByMuseum, 
    id ? { museumId: id as Id<"museums"> } : "skip"
  );
  
  // Check if user follows this museum
  const isFollowing = useQuery(api.follows.isFollowing, 
    id ? { museumId: id as Id<"museums"> } : "skip"
  );
  
  // Follow/unfollow mutations
  const followMuseum = useMutation(api.follows.followMuseum);
  const unfollowMuseum = useMutation(api.follows.unfollowMuseum);

  const handleFollowPress = async () => {
    if (!id) return;
    try {
      if (isFollowing) {
        await unfollowMuseum({ museumId: id as Id<"museums"> });
      } else {
        await followMuseum({ museumId: id as Id<"museums"> });
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  // Loading state
  if (museum === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading museum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Museum not found
  if (museum === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Museum not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const address = museum.location 
    ? `${museum.location.address || ''}, ${museum.location.city || ''}, ${museum.location.state || ''}`
    : 'Address not available';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#222" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Museum Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Museum Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.museumName}>{museum.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{museum.category}</Text>
            </View>
          </View>

          <Text style={styles.description}>
            {museum.description || 'No description available.'}
          </Text>

          <View style={styles.detailRow}>
            <MapPinIcon size={16} color="#8E8E93" />
            <Text style={styles.detailText}>{address}</Text>
          </View>
        </View>

        {/* Follow Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.followButton, 
            isFollowing && styles.followingButton,
            pressed && styles.followButtonPressed
          ]}
          onPress={handleFollowPress}
        >
          <HeartIcon size={20} color="#FFF" fill={isFollowing ? "#FFF" : "transparent"} />
          <Text style={styles.followButtonText}>
            {isFollowing ? 'Following' : 'Follow Museum'}
          </Text>
        </Pressable>

        {/* Upcoming Events Section */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          
          {events && events.length > 0 ? (
            events.map((event) => (
              <EventCard
                key={event._id}
                event={{ ...event, museumId: id } as EventCardData}
                showMuseum={false}
                compactDate={false}
              />
            ))
          ) : (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>No upcoming events</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  museumName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  followButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 24,
  },
  followingButton: {
    backgroundColor: '#34C759',
  },
  followButtonPressed: {
    backgroundColor: '#0056CC',
  },
  followButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  emptyEvents: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyEventsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#222',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
