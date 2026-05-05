import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { StarIcon, XIcon, ChevronDownIcon, CalendarIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator as ExpoImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RN_API_BORDER_LIGHT,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';

const MAX_UPLOAD_IMAGE_SIZE = 512;
const DURATION_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '3 hours', value: 3 },
  { label: '4 hours', value: 4 },
  { label: '5 hours', value: 5 },
] as const;

type Props = {
  visible: boolean;
  checkInId: Id<'checkIns'> | null;
  initialRating: number | null | undefined;
  initialReview: string | undefined;
  initialImageUrls: string[] | undefined;
  initialFriendUserIds: string[] | undefined;
  initialDurationHours: number | undefined;
  initialVisitDate: number | undefined;
  onSave: (
    checkInId: Id<'checkIns'>,
    rating: number | null,
    review: string,
    imageStorageIds: Id<'_storage'>[],
    friendUserIds: string[],
    durationHours: number
  ) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
};

export function EditCheckinModal({
  visible,
  checkInId,
  initialRating,
  initialReview,
  initialImageUrls,
  initialFriendUserIds,
  initialDurationHours,
  initialVisitDate,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [review, setReview] = useState(initialReview ?? '');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialImageUrls ?? []);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(initialFriendUserIds ?? []);
  const [durationHours, setDurationHours] = useState<number>(initialDurationHours ?? 1);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allUsers = useQuery(api.userProfiles.listAllProfiles, {});
  const generateCheckInImageUploadUrl = useMutation(api.checkIns.generateCheckInImageUploadUrl);

  useEffect(() => {
    if (visible) {
      setRating(initialRating ?? null);
      setReview(initialReview ?? '');
      setExistingImageUrls(initialImageUrls ?? []);
      setSelectedImages([]);
      setSelectedFriends(initialFriendUserIds ?? []);
      setDurationHours(initialDurationHours ?? 1);
      setIsDurationDropdownOpen(false);
      setIsSubmitting(false);
    }
  }, [visible, initialRating, initialReview, initialImageUrls, initialFriendUserIds, initialDurationHours]);

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((fid) => fid !== userId) : [...prev, userId]
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
    }
  };

  const removeImage = (uri: string) => {
    setSelectedImages((prev) => prev.filter((asset) => asset.uri !== uri));
  };

  const removeExistingImage = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const getResizedImageUri = async (asset: ImagePicker.ImagePickerAsset) => {
    const originalWidth = asset.width;
    const originalHeight = asset.height;
    const aspectRatio = originalWidth / originalHeight;
    let resizeWidth = MAX_UPLOAD_IMAGE_SIZE;
    let resizeHeight = MAX_UPLOAD_IMAGE_SIZE;
    if (aspectRatio > 1) {
      resizeHeight = Math.round(MAX_UPLOAD_IMAGE_SIZE / aspectRatio);
    } else {
      resizeWidth = Math.round(MAX_UPLOAD_IMAGE_SIZE * aspectRatio);
    }

    try {
      const manipResult = await ExpoImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: resizeWidth, height: resizeHeight } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Image resize error:', error);
      return asset.uri;
    }
  };

  const uploadSelectedImages = async () => {
    if (selectedImages.length === 0) {
      return [];
    }

    const storageIds: Id<'_storage'>[] = [];
    for (const asset of selectedImages) {
      try {
        const resizedUri = await getResizedImageUri(asset);
        const response = await fetch(resizedUri);
        const blob = await response.blob();
        const uploadUrl = await generateCheckInImageUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': asset.mimeType ?? 'image/jpeg' },
          body: blob,
        });
        const { storageId } = await uploadResponse.json();
        storageIds.push(storageId);
      } catch (error) {
        console.error('Image upload error:', error);
        Alert.alert('Error', 'Failed to upload one or more images. Please try again.');
        return [];
      }
    }
    return storageIds;
  };

  const handleSave = async () => {
    if (!checkInId) return;

    setIsSubmitting(true);
    try {
      let imageStorageIds: Id<'_storage'>[] = [];
      if (selectedImages.length > 0) {
        imageStorageIds = await uploadSelectedImages();
        if (imageStorageIds.length === 0 && selectedImages.length > 0) {
          setIsSubmitting(false);
          return;
        }
      }

      await onSave(checkInId, rating, review.trim(), imageStorageIds, selectedFriends, durationHours);
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
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!visible) return null;

  const totalImageCount = existingImageUrls.length + selectedImages.length;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
        style={{ flex: 1 }}>
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} accessibilityLabel="Dismiss" />
        <View className="z-10 max-h-[85%] rounded-t-2xl bg-background shadow-lg">
          <View className="px-6 pb-3 pt-3">
            <View className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <Text className="text-xl font-bold text-foreground">Edit check-in</Text>
          </View>

          <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
            <Label nativeID="edit-checkin-rating" className="mb-2 text-muted-foreground">
              Rating
            </Label>
            <View className="mb-5 flex-row gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  accessibilityLabel={`${star} stars`}
                  onPress={() => setRating(rating === star ? null : star)}
                  className="rounded-lg p-1 active:opacity-80">
                  <StarIcon
                    size={36}
                    color={star <= (rating ?? 0) ? '#FFB800' : '#E0E0E0'}
                    fill={star <= (rating ?? 0) ? '#FFB800' : 'none'}
                  />
                </Pressable>
              ))}
            </View>

            <Label nativeID="edit-checkin-review" className="mb-2 text-muted-foreground">
              Comment (optional)
            </Label>
            <Input
              nativeID="edit-checkin-review"
              value={review}
              onChangeText={setReview}
              placeholder="What did you think?"
              multiline
              numberOfLines={3}
              maxLength={500}
              className="mb-2 min-h-24 h-auto py-3 text-base leading-5"
              textAlignVertical="top"
            />
            <Text className="mb-4 text-right text-xs text-muted-foreground">{review.length}/500</Text>

            <View className="mb-4 flex-row items-center justify-between">
              <Label className="text-muted-foreground">Photos</Label>
              <Pressable
                className="rounded-lg bg-primary px-4 py-2 active:opacity-80"
                onPress={pickImages}
                disabled={isSubmitting}>
                <Text className="text-sm font-semibold text-primary-foreground">
                  {totalImageCount > 0 ? 'Replace Photos' : 'Add Photos'}
                </Text>
              </Pressable>
            </View>

            {selectedImages.length > 0 ? (
              <ScrollView horizontal className="mb-4 -mx-1" showsHorizontalScrollIndicator={false}>
                {selectedImages.map((asset, index) => (
                  <View key={asset.uri} className="relative mx-1">
                    <Image source={{ uri: asset.uri }} className="h-20 w-20 rounded-lg" />
                    <Pressable
                      className="absolute -right-1.5 -top-1.5 size-5 items-center justify-center rounded-full bg-destructive"
                      onPress={() => removeImage(asset.uri)}>
                      <XIcon size={12} color="white" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : existingImageUrls.length > 0 ? (
              <ScrollView horizontal className="mb-4 -mx-1" showsHorizontalScrollIndicator={false}>
                {existingImageUrls.map((url, index) => (
                  <View key={url} className="relative mx-1">
                    <Image source={{ uri: url }} className="h-20 w-20 rounded-lg" />
                    <Pressable
                      className="absolute -right-1.5 -top-1.5 size-5 items-center justify-center rounded-full bg-destructive"
                      onPress={() => removeExistingImage(url)}>
                      <XIcon size={12} color="white" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {initialVisitDate && (
              <View className="mb-4">
                <Label className="mb-2 text-muted-foreground">Visit Date</Label>
                <View className="flex-row items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <CalendarIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                  <Text className="text-base text-muted-foreground">
                    {formatDate(initialVisitDate)}
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-muted-foreground">Visit date cannot be changed</Text>
              </View>
            )}

            <Label className="mb-2 text-muted-foreground">Duration</Label>
            <View className="relative mb-4">
              <Pressable
                className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3 active:opacity-80"
                onPress={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}>
                <Text className="text-base text-foreground">
                  {DURATION_OPTIONS.find((opt) => opt.value === durationHours)?.label ?? '1 hour'}
                </Text>
                <ChevronDownIcon size={20} color={RN_API_MUTED_FOREGROUND_LIGHT} />
              </Pressable>
              {isDurationDropdownOpen && (
                <View className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {DURATION_OPTIONS.map((option, index) => {
                    const isLast = index === DURATION_OPTIONS.length - 1;
                    return (
                      <Pressable
                        key={option.value}
                        className={cn(
                          'px-4 py-3 active:bg-muted',
                          !isLast && 'border-b border-border'
                        )}
                        onPress={() => {
                          setDurationHours(option.value);
                          setIsDurationDropdownOpen(false);
                        }}>
                        <Text
                          className={cn(
                            'text-base',
                            durationHours === option.value
                              ? 'font-semibold text-primary'
                              : 'text-foreground'
                          )}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {allUsers && allUsers.length > 0 && (
              <View className="mb-4">
                <Label className="mb-2 text-muted-foreground">Tag Friends (optional)</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                  {allUsers.map((user) => {
                    const isSelected = selectedFriends.includes(user.userId);
                    return (
                      <Pressable
                        key={user.userId}
                        className={cn(
                          'mx-1 rounded-full border px-4 py-2 active:opacity-80',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card'
                        )}
                        onPress={() => toggleFriend(user.userId)}>
                        <Text
                          className={cn(
                            'text-sm font-medium',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}>
                          {user.name || 'Unknown'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View className="border-t border-border px-6 py-4">
            <View className="gap-3">
              <Button
                variant="ghost"
                className="h-auto self-start px-0 py-2 active:opacity-80"
                onPress={handleDelete}
                disabled={isSubmitting}>
                <Text className="text-base font-semibold text-destructive">Delete check-in</Text>
              </Button>
              <View className="flex-row justify-end gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-auto min-h-12 border-0 px-5 py-3"
                  onPress={onClose}
                  disabled={isSubmitting}>
                  <Text className="text-base font-semibold leading-normal text-secondary-foreground">
                    Cancel
                  </Text>
                </Button>
                <Button
                  size="lg"
                  className="h-auto min-h-12 border-0 px-6 py-3"
                  onPress={handleSave}
                  disabled={isSubmitting}>
                  <Text className="text-base font-semibold leading-normal">
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
