import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { XIcon, CalendarIcon, ChevronDownIcon, CheckIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckInStarRating } from '@/components/check-in-star-rating';
import { CheckInDurationSelect } from '@/components/check-in-duration-select';
import { CheckInTagFriends } from '@/components/check-in-tag-friends';
import { cn } from '@/lib/utils';
import { zipCheckInImageUrlsAndIds } from '@/lib/check-in-shared';
import { uploadCheckInPickerAssets } from '@/lib/check-in-image-upload';
import {
  RN_API_BACKGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';

type Props = {
  visible: boolean;
  checkInId: Id<'checkIns'> | null;
  museumId: Id<'museums'> | undefined;
  initialRating: number | null | undefined;
  initialReview: string | undefined;
  initialImageUrls: string[] | undefined;
  initialImageIds: Id<'_storage'>[] | undefined;
  initialFriendUserIds: string[] | undefined;
  initialDurationHours: number | undefined;
  initialVisitDate: number | undefined;
  initialAttendedEventIds: (Id<'events'> | Id<'exhibitions'>)[] | undefined;
  onSave: (
    checkInId: Id<'checkIns'>,
    rating: number | null,
    review: string,
    imageStorageIds: Id<'_storage'>[] | undefined,
    friendUserIds: string[],
    durationHours: number,
    attendedEventIds: (Id<'events'> | Id<'exhibitions'>)[] | undefined
  ) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
};

export function EditCheckinModal({
  visible,
  checkInId,
  museumId,
  initialRating,
  initialReview,
  initialImageUrls,
  initialImageIds,
  initialFriendUserIds,
  initialDurationHours,
  initialVisitDate,
  initialAttendedEventIds,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const { theme } = useUniwind();
  const mutedIcon = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;

  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [review, setReview] = useState(initialReview ?? '');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(() =>
    zipCheckInImageUrlsAndIds(initialImageUrls, initialImageIds).urls
  );
  const [remainingImageIds, setRemainingImageIds] = useState<Id<'_storage'>[]>(() =>
    zipCheckInImageUrlsAndIds(initialImageUrls, initialImageIds).ids
  );
  const [imagesDirty, setImagesDirty] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(initialFriendUserIds ?? []);
  const [durationHours, setDurationHours] = useState<number>(initialDurationHours ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    (initialAttendedEventIds ?? []).map((id) => id as string)
  );
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);

  const currentUser = useQuery(api.auth.getCurrentUser);
  const generateCheckInImageUploadUrl = useMutation(api.checkIns.generateCheckInImageUploadUrl);
  const museumEvents = useQuery(
    api.events.getEventsByMuseum,
    museumId ? { museumId } : 'skip'
  );

  useEffect(() => {
    if (visible) {
      const zipped = zipCheckInImageUrlsAndIds(initialImageUrls, initialImageIds);
      setRating(initialRating ?? null);
      setReview(initialReview ?? '');
      setExistingImageUrls(zipped.urls);
      setRemainingImageIds(zipped.ids);
      setImagesDirty(false);
      setSelectedImages([]);
      setSelectedFriends(initialFriendUserIds ?? []);
      setDurationHours(initialDurationHours ?? 1);
      setIsSubmitting(false);
      setSelectedEvents((initialAttendedEventIds ?? []).map((id) => id as string));
      setEventsDropdownOpen(false);
    }
  }, [
    visible,
    initialRating,
    initialReview,
    initialImageUrls,
    initialImageIds,
    initialFriendUserIds,
    initialDurationHours,
    initialAttendedEventIds,
  ]);

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
      setExistingImageUrls([]);
      setRemainingImageIds([]);
      setImagesDirty(true);
    }
  };

  const removeNewImage = (uri: string) => {
    setSelectedImages((prev) => prev.filter((a) => a.uri !== uri));
    setImagesDirty(true);
  };

  const removeExistingAt = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    setRemainingImageIds((prev) => prev.filter((_, i) => i !== index));
    setImagesDirty(true);
  };

  const handleSave = async () => {
    if (!checkInId) return;

    setIsSubmitting(true);
    try {
      let imageStorageIds: Id<'_storage'>[] | undefined = undefined;

      if (selectedImages.length > 0) {
        imageStorageIds = await uploadCheckInPickerAssets(selectedImages, () =>
          generateCheckInImageUploadUrl({})
        );
      } else if (imagesDirty) {
        imageStorageIds = [...remainingImageIds];
      }

      await onSave(
        checkInId,
        rating,
        review.trim(),
        imageStorageIds,
        selectedFriends,
        durationHours,
        selectedEvents.length > 0 ? (selectedEvents as Id<'events'>[]) : undefined
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to update check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete check-in',
      'Remove this check-in from your passport? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(),
        },
      ]
    );
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  if (!visible) return null;

  const totalImageCount = existingImageUrls.length + selectedImages.length;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} accessibilityLabel="Dismiss" />
        <View className="z-10 max-h-[85%] rounded-t-2xl bg-background shadow-lg">
          <View className="px-6 pb-3 pt-3">
            <View className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <Text className="text-xl font-bold text-foreground">Edit check-in</Text>
          </View>

          <ScrollView
            className="px-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Label nativeID="edit-checkin-rating" className="mb-2 text-muted-foreground">
              Rating
            </Label>
            <CheckInStarRating value={rating} onChange={setRating} starSize={36} className="mb-5" />

            <Label nativeID="edit-checkin-review" className="mb-2 text-muted-foreground">
              Comment (optional)
            </Label>
            <View className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
              <Input
                nativeID="edit-checkin-review"
                value={review}
                onChangeText={setReview}
                placeholder="What did you think?"
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
                className="min-h-24 border-0 bg-transparent shadow-none rounded-none px-3 pb-1 pt-3 text-base leading-5"
              />
              <Text className="px-3 pb-2.5 pt-0 text-right text-xs text-muted-foreground">
                {review.length}/500
              </Text>
            </View>

            <View className="mb-4 flex-row items-center justify-between gap-3">
              <Text className="min-w-0 shrink text-sm font-medium text-muted-foreground">Photos</Text>
              <Button
                size="sm"
                className="shrink-0"
                onPress={pickImages}
                disabled={isSubmitting}>
                <Text>{totalImageCount > 0 ? 'Replace Photos' : 'Add Photos'}</Text>
              </Button>
            </View>

            {selectedImages.length > 0 ? (
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                className="mb-4 -mx-1">
                {selectedImages.map((asset) => (
                  <View key={asset.uri} className="relative mx-1" collapsable={false}>
                    <Image source={{ uri: asset.uri }} className="size-20 rounded-xl" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      hitSlop={12}
                      className="absolute -right-2 -top-2 z-10 size-7 items-center justify-center rounded-full bg-destructive shadow-sm"
                      onPress={() => removeNewImage(asset.uri)}>
                      <XIcon size={14} color={RN_API_BACKGROUND_LIGHT} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : existingImageUrls.length > 0 ? (
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                className="mb-4 -mx-1">
                {existingImageUrls.map((url, index) => (
                  <View key={`${url}-${index}`} className="relative mx-1" collapsable={false}>
                    <Image source={{ uri: url }} className="size-20 rounded-xl" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      hitSlop={12}
                      className="absolute -right-2 -top-2 z-10 size-7 items-center justify-center rounded-full bg-destructive shadow-sm"
                      onPress={() => removeExistingAt(index)}>
                      <XIcon size={14} color={RN_API_BACKGROUND_LIGHT} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {initialVisitDate ? (
              <View className="mb-4">
                <Label className="mb-2 text-muted-foreground">Visit Date</Label>
                <View className="flex-row items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <CalendarIcon size={16} color={mutedIcon} />
                  <Text className="text-base text-muted-foreground">{formatDate(initialVisitDate)}</Text>
                </View>
                <Text className="mt-1 text-xs text-muted-foreground">Visit date cannot be changed</Text>
              </View>
            ) : null}

            <Label className="mb-2 text-muted-foreground">Duration</Label>
            <View className="mb-4">
              <CheckInDurationSelect value={durationHours} onChange={setDurationHours} />
            </View>

            {museumEvents && museumEvents.length > 0 && (
              <View className="mb-4">
                <Label className="mb-2 text-muted-foreground">Exhibitions & Events</Label>
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
                      color={mutedIcon}
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
                            className={cn(
                              'flex-row items-center gap-3 px-4 py-3 active:bg-muted',
                              !isLast && 'border-b border-border'
                            )}
                            onPress={() => toggleEvent(event._id)}>
                            <View
                              className={cn(
                                'size-5 items-center justify-center rounded border-2',
                                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                              )}>
                              {isSelected ? (
                                <CheckIcon size={14} color={RN_API_BACKGROUND_LIGHT} strokeWidth={3} />
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
                labelClassName="mb-2 text-muted-foreground"
              />
            ) : null}
          </ScrollView>

          <View className="border-t border-border px-6 py-4">
            <View className="gap-3">
              <Button variant="ghost" className="h-auto self-start px-0 py-2 active:opacity-90" onPress={handleDelete} disabled={isSubmitting}>
                <Text className="text-base font-semibold text-destructive">Delete check-in</Text>
              </Button>
              <View className="flex-row justify-end gap-3">
                <Button variant="secondary" size="lg" className="h-auto min-h-12 border-0 px-5 py-3" onPress={onClose} disabled={isSubmitting}>
                  <Text className="text-base font-semibold leading-normal text-secondary-foreground">Cancel</Text>
                </Button>
                <Button size="lg" className="h-auto min-h-12 border-0 px-6 py-3" onPress={handleSave} disabled={isSubmitting}>
                  <Text className="text-base font-semibold leading-normal">{isSubmitting ? 'Saving...' : 'Save'}</Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
