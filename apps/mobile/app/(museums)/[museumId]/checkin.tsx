import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { ArrowLeftIcon, StarIcon, XIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const TAB_ROUTE_SEGMENTS = new Set(['tabs', 'index', 'home', 'explore', 'profile']);

export default function CheckInScreen() {
  const { museumId } = useLocalSearchParams<{ museumId: string }>();
  const rawId = typeof museumId === 'string' ? museumId : Array.isArray(museumId) ? museumId[0] : undefined;
  const isTabSegment = rawId != null && TAB_ROUTE_SEGMENTS.has(rawId);
  const id = isTabSegment ? undefined : rawId;
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitDate, setVisitDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isTabSegment) {
      router.replace('/(tabs)/home');
    }
  }, [isTabSegment]);

  // Fetch museum details (skip when param is a tab segment)
  const museum = useQuery(api.museums.getMuseum, 
    id ? { id: id as Id<"museums"> } : "skip"
  );

  // Fetch all users for friend selection
  const allUsers = useQuery(api.userProfiles.listAllProfiles, {});

  // Create check-in mutation
  const createCheckIn = useMutation(api.checkIns.createCheckIn);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setVisitDate(selectedDate);
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!id) {
      Alert.alert('Error', 'Museum ID not found');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCheckIn({
        contentType: "museum",
        contentId: museumId as Id<"museums">,
        rating: rating || undefined,
        review: review.trim() || undefined,
        friendUserIds: selectedFriends,
        visitDate: visitDate.getTime(),
      });

      Alert.alert('Success', 'Check-in created!');
      router.back();
    } catch (error) {
      console.error('Check-in failed:', error);
      Alert.alert('Error', 'Failed to create check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (museum === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (museum === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backIcon} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color="#222" />
          </Pressable>
          <Text style={styles.headerTitle}>Check In</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Museum not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#222" />
        </Pressable>
        <Text style={styles.headerTitle}>Check In</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Museum Info */}
        <View style={styles.museumInfo}>
          <Text style={styles.museumName}>{museum.name}</Text>
          <Text style={styles.museumCategory}>{museum.category}</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Your Visit</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(rating === star ? null : star)}
                style={styles.starButton}
              >
                <StarIcon
                  size={32}
                  color={star <= (rating || 0) ? '#FFB800' : '#E0E0E0'}
                  fill={star <= (rating || 0) ? '#FFB800' : 'none'}
                />
              </Pressable>
            ))}
          </View>
          {rating && (
            <Text style={styles.ratingText}>{rating} star{rating !== 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Review Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Write a Review</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your thoughts about this museum..."
            placeholderTextColor="#999"
            value={review}
            onChangeText={setReview}
            maxLength={500}
            multiline
            numberOfLines={5}
          />
          <Text style={styles.charCount}>{review.length}/500</Text>
        </View>

        {/* Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date of Visit</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {visitDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={visitDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Friends Section */}
        {allUsers && allUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who visited with you?</Text>
            <View style={styles.friendsContainer}>
              {allUsers.map((user) => (
                <Pressable
                  key={user.userId}
                  style={[
                    styles.friendChip,
                    selectedFriends.includes(user.userId) && styles.friendChipSelected,
                  ]}
                  onPress={() => toggleFriend(user.userId)}
                >
                  <Text
                    style={[
                      styles.friendChipText,
                      selectedFriends.includes(user.userId) && styles.friendChipTextSelected,
                    ]}
                  >
                    {user.name || user.email}
                  </Text>
                  {selectedFriends.includes(user.userId) && (
                    <XIcon size={16} color="#FFF" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Complete Check-In</Text>
          )}
        </Pressable>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#222',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  museumInfo: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  museumName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  museumCategory: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reviewInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 15,
    color: '#222',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'right',
  },
  dateButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  friendsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  friendChip: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  friendChipText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  friendChipTextSelected: {
    color: '#FFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
