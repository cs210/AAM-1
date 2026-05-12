import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { usePostHog } from 'posthog-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { XIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { AuthGuard } from '@/components/AuthGuard';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { CheckInStarRating } from '@/components/check-in-star-rating';
import { CheckInDurationSelect } from '@/components/check-in-duration-select';
import { cn } from '@/lib/utils';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { uploadCheckInPickerAssets } from '@/lib/check-in-image-upload';
import {
  RN_API_BACKGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';

const TAB_ROUTE_SEGMENTS = new Set(['tabs', 'index', 'home', 'explore', 'profile']);

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { museumId } = useLocalSearchParams<{ museumId: string }>();
  const rawId = typeof museumId === 'string' ? museumId : Array.isArray(museumId) ? museumId[0] : undefined;
  const isTabSegment = rawId != null && TAB_ROUTE_SEGMENTS.has(rawId);
  const id = isTabSegment ? undefined : rawId;
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitDate, setVisitDate] = useState(new Date());
  const [durationHours, setDurationHours] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (isTabSegment) {
      router.replace('/(tabs)/home');
    }
  }, [isTabSegment]);

  const posthog = usePostHog();

  const museum = useQuery(api.museums.getMuseum, id ? { id: id as Id<'museums'> } : 'skip');
  const currentUser = useQuery(api.auth.getCurrentUser);
  const userCheckIns = useQuery(
    api.checkIns.getUserMuseumCheckIns,
    id && currentUser ? { userId: currentUser._id, museumId: id as Id<'museums'> } : 'skip'
  );
  const museumEvents = useQuery(
    api.events.getEventsByMuseum,
    id ? { museumId: id as Id<'museums'> } : 'skip'
  );

  const allUsers = useQuery(api.userProfiles.listAllProfiles, {});
  const followingUserIds = useQuery(
    api.follows.getFollowing,
    currentUser ? { userId: currentUser._id } : 'skip'
  );

  const createCheckIn = useMutation(api.checkIns.createCheckIn);
  const generateCheckInImageUploadUrl = useMutation(api.checkIns.generateCheckInImageUploadUrl);

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setVisitDate(selectedDate);
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((fid) => fid !== userId) : [...prev, userId]
    );
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((eid) => eid !== eventId) : [...prev, eventId]
    );
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Please allow photo library access to add images to your check-in.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImages(result.assets.slice(0, 5));
    }
  };

  const removeImage = (uri: string) => {
    setSelectedImages((prev) => prev.filter((asset) => asset.uri !== uri));
  };

  const handleSubmit = async () => {
    if (!id) {
      Alert.alert('Error', 'Museum ID not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const imageStorageIds =
        selectedImages.length > 0
          ? await uploadCheckInPickerAssets(selectedImages, () => generateCheckInImageUploadUrl({}))
          : [];

      const isRepeatVisit = userCheckIns != null && userCheckIns.length > 0;

      await createCheckIn({
        contentType: 'museum',
        contentId: museumId as Id<'museums'>,
        rating: rating || undefined,
        review: review.trim() || undefined,
        imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        friendUserIds: selectedFriends,
        durationHours,
        visitDate: visitDate.getTime(),
        attendedEventIds: selectedEvents.length > 0 ? (selectedEvents as Id<'events'>[]) : undefined,
      });

      posthog?.capture('museum_visited', {
        museumId: id,
        isRepeatVisit: isRepeatVisit === true,
        hasRating: rating !== null,
        hasReview: review.trim().length > 0,
        photoCount: imageStorageIds.length,
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
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <BrandActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (museum === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenTitleBar title="Check In" onBackPress={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-foreground">Museum not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthGuard>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScreenTitleBar title="Check In" onBackPress={() => router.back()} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="grow px-4 pt-0"
          contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
          <View className="mb-6 rounded-xl border border-border bg-card p-4">
            <Text className="mb-1 text-xl font-bold text-foreground">{museum.name}</Text>
            <Text className="text-sm capitalize text-muted-foreground">{museum.category}</Text>
          </View>

          <View className="mb-6">
            <Label className="mb-3 text-base font-semibold text-foreground">Rate your visit</Label>
            <CheckInStarRating value={rating} onChange={setRating} className="justify-center" />
            {rating ? (
              <Text className="mt-2 text-center text-sm italic text-muted-foreground">
                {rating} star{rating !== 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>

          <View className="mb-6">
            <Label className="mb-3 text-base font-semibold text-foreground">Write a review</Label>
            <View className="overflow-hidden rounded-xl border border-border bg-card">
              <Input
                value={review}
                onChangeText={setReview}
                placeholder="Share your thoughts about this museum..."
                maxLength={500}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className="min-h-[120px] border-0 bg-transparent shadow-none rounded-none px-3 pb-1 pt-3 text-base leading-5"
              />
              <Text className="px-3 pb-2.5 pt-0 text-right text-xs text-muted-foreground">
                {review.length}/500
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Text className="min-w-0 shrink text-base font-semibold text-foreground">Photos</Text>
              <Pressable
                className="shrink-0 rounded-lg bg-primary px-4 py-2 active:opacity-90"
                onPress={pickImages}
                disabled={isSubmitting}>
                <Text className="text-sm font-semibold text-primary-foreground">
                  {selectedImages.length > 0 ? 'Replace Photos' : 'Add Photos'}
                </Text>
              </Pressable>
            </View>

            {selectedImages.length > 0 ? (
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                className="-mx-1">
                {selectedImages.map((asset) => (
                  <View key={asset.uri} className="relative mx-1" collapsable={false}>
                    <Image
                      source={{ uri: asset.uri }}
                      className="size-20 rounded-xl bg-muted"
                      resizeMode="cover"
                    />
                    <Pressable
                      accessibilityLabel="Remove photo"
                      hitSlop={12}
                      className="absolute -right-1 -top-1 z-10 size-7 items-center justify-center rounded-full bg-destructive shadow-sm"
                      onPress={() => removeImage(asset.uri)}>
                      <XIcon size={14} color={RN_API_BACKGROUND_LIGHT} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-sm text-muted-foreground">Add up to 5 photos to your check-in.</Text>
            )}
          </View>

          <View className="mb-6">
            <Label className="mb-3 text-base font-semibold text-foreground">How long were you there?</Label>
            <CheckInDurationSelect value={durationHours} onChange={setDurationHours} />
          </View>

          <View className="mb-6">
            <Label className="mb-3 text-base font-semibold text-foreground">Date of visit</Label>
            <Pressable
              className="rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-90"
              onPress={() => setShowDatePicker(true)}>
              <Text className="text-base font-medium text-foreground">
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

          {museumEvents && museumEvents.length > 0 && (
            <View className="mb-6">
              <Label className="mb-3 text-base font-semibold text-foreground">
                Which events/exhibits did you attend?
              </Label>
              <View className="flex-row flex-wrap gap-2">
                {museumEvents.map((event) => {
                  const selected = selectedEvents.includes(event._id);
                  return (
                    <Pressable
                      key={event._id}
                      className={cn(
                        'flex-row items-center gap-1 rounded-full border px-3 py-2 active:opacity-90',
                        selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                      )}
                      onPress={() => toggleEvent(event._id)}>
                      <Text
                        className={cn('text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}>
                        {event.title}
                      </Text>
                      {selected ? <XIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {allUsers && followingUserIds && followingUserIds.length > 0 ? (
            <View className="mb-6">
              <Label className="mb-3 text-base font-semibold text-foreground">Who visited with you?</Label>
              <View className="flex-row flex-wrap gap-2">
                {allUsers
                  .filter((user) => followingUserIds.includes(user.userId))
                  .map((user) => {
                    const selected = selectedFriends.includes(user.userId);
                    return (
                      <Pressable
                        key={user.userId}
                        className={cn(
                          'flex-row items-center gap-1 rounded-full border px-3 py-2 active:opacity-90',
                          selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        )}
                        onPress={() => toggleFriend(user.userId)}>
                        <Text
                          className={cn('text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}>
                          {user.name || user.email}
                        </Text>
                        {selected ? <XIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} /> : null}
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          ) : (
            <View className="mb-6">
              <Label className="mb-3 text-base font-semibold text-foreground">Who visited with you?</Label>
              <Text className="text-sm text-muted-foreground">
                Follow your friends to add them to your check-ins!
              </Text>
            </View>
          )}

          <Button
            size="lg"
            className="mb-12 min-h-12 w-full rounded-xl active:opacity-90"
            disabled={isSubmitting}
            onPress={handleSubmit}>
            {isSubmitting ? (
              <BrandActivityIndicator size="small" color={RN_API_BACKGROUND_LIGHT} />
            ) : (
              <Text className="text-base font-semibold text-primary-foreground">Complete check-in</Text>
            )}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}
