import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { usePostHog } from 'posthog-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { XIcon, ChevronDownIcon, CheckIcon } from 'lucide-react-native';
import { CheckInTagFriends } from '@/components/check-in-tag-friends';
import * as ImagePicker from 'expo-image-picker';
import { CategoryTag } from '@/components/category-tag';
import { AuthGuard } from '@/components/AuthGuard';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { CheckInStarRating } from '@/components/check-in-star-rating';
import { CheckInDurationSelect } from '@/components/check-in-duration-select';
import { VisitDatePickerField } from '@/components/visit-date-picker-field';
import { cn } from '@/lib/utils';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { uploadCheckInPickerAssets } from '@/lib/check-in-image-upload';
import { useUniwind } from 'uniwind';
import {
  RN_API_BACKGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_PRIMARY_LIGHT,
  RN_API_PRIMARY_DARK,
} from '@/constants/rn-api-colors';

const TAB_ROUTE_SEGMENTS = new Set(['tabs', 'index', 'home', 'explore', 'profile']);

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const { museumId } = useLocalSearchParams<{ museumId: string }>();
  const rawId = typeof museumId === 'string' ? museumId : Array.isArray(museumId) ? museumId[0] : undefined;
  const isTabSegment = rawId != null && TAB_ROUTE_SEGMENTS.has(rawId);
  const id = isTabSegment ? undefined : rawId;
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [visitDate, setVisitDate] = useState(new Date());
  const [durationHours, setDurationHours] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);

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

  const createCheckIn = useMutation(api.checkIns.createCheckIn);
  const generateCheckInImageUploadUrl = useMutation(api.checkIns.generateCheckInImageUploadUrl);

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
        attendedEventIds: selectedEvents.length > 0 ? (selectedEvents as (Id<'events'> | Id<'exhibitions'>)[]) : undefined,
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
            <CategoryTag category={museum.category} className="self-start" />
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
            <VisitDatePickerField value={visitDate} onChange={setVisitDate} maximumDate={new Date()} />
          </View>

          {museumEvents && museumEvents.length > 0 && (
            <View className="mb-6">
              <Label className="mb-3 text-base font-semibold text-foreground">
                Exhibitions & Events
              </Label>
              <View className="relative">
                <Pressable
                  className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-90"
                  onPress={() => setEventsDropdownOpen((o) => !o)}>
                  <Text className="flex-1 text-base text-foreground">
                    {selectedEvents.length === 0
                      ? 'Select events/exhibitions'
                      : `${selectedEvents.length} selected`}
                  </Text>
                  <ChevronDownIcon
                    size={20}
                    color={theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT}
                    style={{ transform: [{ rotate: eventsDropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
                {eventsDropdownOpen ? (
                  <View className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                    {museumEvents.map((event, index) => {
                      const isSelected = selectedEvents.includes(event._id);
                      const isLast = index === museumEvents.length - 1;
                      return (
                        <Pressable
                          key={event._id}
                          className={cn('flex-row items-center gap-3 px-4 py-3 active:bg-muted', !isLast && 'border-b border-border')}
                          onPress={() => toggleEvent(event._id)}>
                          <View
                            className={cn(
                              'size-5 items-center justify-center rounded border-2',
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                            )}>
                            {isSelected ? (
                              <CheckIcon
                                size={14}
                                color={RN_API_BACKGROUND_LIGHT}
                                strokeWidth={3}
                              />
                            ) : null}
                          </View>
                          <Text className="flex-1 text-base text-foreground">{event.title}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {currentUser ? (
            <CheckInTagFriends
              selectedUserIds={selectedFriends}
              onSelectedUserIdsChange={setSelectedFriends}
              currentUserId={currentUser._id}
            />
          ) : null}

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
