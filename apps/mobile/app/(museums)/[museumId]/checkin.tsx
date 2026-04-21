import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { ArrowLeftIcon, ChevronDownIcon, StarIcon, XIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator as ExpoImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AuthGuard } from '@/components/AuthGuard';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';
import {
  RN_API_BACKGROUND_LIGHT,
  RN_API_BORDER_LIGHT,
  RN_API_FOREGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';

const TAB_ROUTE_SEGMENTS = new Set(['tabs', 'index', 'home', 'explore', 'profile']);
const MAX_UPLOAD_IMAGE_SIZE = 512;
const DURATION_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '3 hours', value: 3 },
  { label: '4 hours', value: 4 },
  { label: '5 hours', value: 5 },
] as const;

export default function CheckInScreen() {
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
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isTabSegment) {
      router.replace('/(tabs)/home');
    }
  }, [isTabSegment]);

  const museum = useQuery(api.museums.getMuseum, id ? { id: id as Id<'museums'> } : 'skip');

  const allUsers = useQuery(api.userProfiles.listAllProfiles, {});

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

  const getResizedImageUri = async (asset: ImagePicker.ImagePickerAsset) => {
    const originalWidth = asset.width;
    const originalHeight = asset.height;

    if (!originalWidth || !originalHeight) {
      return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
    }

    if (originalWidth <= MAX_UPLOAD_IMAGE_SIZE && originalHeight <= MAX_UPLOAD_IMAGE_SIZE) {
      return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
    }

    const scale = Math.min(
      MAX_UPLOAD_IMAGE_SIZE / originalWidth,
      MAX_UPLOAD_IMAGE_SIZE / originalHeight
    );
    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));

    const context = ExpoImageManipulator.manipulate(asset.uri);
    context.resize({ width: targetWidth, height: targetHeight });

    const renderedImage = await context.renderAsync();
    const resizedImage = await renderedImage.saveAsync({
      compress: 0.8,
      format: SaveFormat.JPEG,
    });

    return { uri: resizedImage.uri, mimeType: 'image/jpeg' as const };
  };

  const uploadSelectedImages = async (): Promise<Id<'_storage'>[]> => {
    if (selectedImages.length === 0) {
      return [];
    }

    const storageIds: Id<'_storage'>[] = [];

    for (const asset of selectedImages) {
      const processedImage = await getResizedImageUri(asset);
      const uploadUrl = await generateCheckInImageUploadUrl({});
      const fileResponse = await fetch(processedImage.uri);
      const fileBlob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': processedImage.mimeType,
        },
        body: fileBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload one of the selected images.');
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<'_storage'>;
      };
      storageIds.push(storageId);
    }

    return storageIds;
  };

  const handleSubmit = async () => {
    if (!id) {
      Alert.alert('Error', 'Museum ID not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const imageStorageIds = await uploadSelectedImages();

      await createCheckIn({
        contentType: 'museum',
        contentId: museumId as Id<'museums'>,
        rating: rating || undefined,
        review: review.trim() || undefined,
        imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        friendUserIds: selectedFriends,
        durationHours,
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
      <SafeAreaView className="flex-1 bg-muted" style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <BrandActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (museum === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3">
          <Pressable className="size-10 items-center justify-center" onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={RN_API_FOREGROUND_LIGHT} />
          </Pressable>
          <Text className="flex-1 text-center text-base font-semibold text-foreground">Check In</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-foreground">Museum not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthGuard>
      <SafeAreaView className="flex-1 bg-muted" style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />

        <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3">
          <Pressable className="size-10 items-center justify-center" onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={RN_API_FOREGROUND_LIGHT} />
          </Pressable>
          <Text className="flex-1 text-center text-base font-semibold text-foreground">Check In</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}>
          <View className="mb-6 rounded-xl border border-border bg-card p-4">
            <Text className="mb-1 text-xl font-bold text-foreground">{museum.name}</Text>
            <Text className="text-sm capitalize text-muted-foreground">{museum.category}</Text>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-base font-semibold text-foreground">Rate Your Visit</Text>
            <View className="mb-2 flex-row justify-around">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  className="p-2"
                  onPress={() => setRating(rating === star ? null : star)}>
                  <StarIcon
                    size={32}
                    color={star <= (rating || 0) ? RN_API_PRIMARY_LIGHT : RN_API_BORDER_LIGHT}
                    fill={star <= (rating || 0) ? RN_API_PRIMARY_LIGHT : 'none'}
                  />
                </Pressable>
              ))}
            </View>
            {rating ? (
              <Text className="text-center text-sm italic text-muted-foreground">
                {rating} star{rating !== 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-base font-semibold text-foreground">Write a Review</Text>
            <TextInput
              className="min-h-[120px] rounded-[10px] border border-border bg-card p-3 text-[15px] text-foreground"
              placeholder="Share your thoughts about this museum..."
              placeholderTextColor={RN_API_MUTED_FOREGROUND_LIGHT}
              value={review}
              onChangeText={setReview}
              maxLength={500}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text className="mt-2 text-right text-xs text-muted-foreground">{review.length}/500</Text>
          </View>

          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Photos</Text>
              <Pressable
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2"
                onPress={pickImages}
                disabled={isSubmitting}>
                <Text className="text-[13px] font-semibold text-primary">
                  {selectedImages.length > 0 ? 'Replace Photos' : 'Add Photos'}
                </Text>
              </Pressable>
            </View>

            {selectedImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}>
                {selectedImages.map((asset) => (
                  <View key={asset.uri} className="relative size-[84px] overflow-hidden rounded-[10px] bg-muted">
                    <Image source={{ uri: asset.uri }} className="size-full" resizeMode="cover" />
                    <Pressable
                      className="absolute right-1.5 top-1.5 size-5 items-center justify-center rounded-full bg-black/60"
                      onPress={() => removeImage(asset.uri)}
                      hitSlop={8}>
                      <XIcon size={12} color={RN_API_BACKGROUND_LIGHT} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-sm text-muted-foreground">Add up to 5 photos to your check-in.</Text>
            )}
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-base font-semibold text-foreground">How long were you there?</Text>
            <View>
              <Pressable
                className="flex-row items-center justify-between rounded-[10px] border border-border bg-card px-3 py-3.5"
                onPress={() => setIsDurationDropdownOpen((prev) => !prev)}>
                <Text className="text-[15px] font-medium text-foreground">
                  {DURATION_OPTIONS.find((option) => option.value === durationHours)?.label ?? '1 hour'}
                </Text>
                <ChevronDownIcon
                  size={18}
                  color={RN_API_MUTED_FOREGROUND_LIGHT}
                  style={{ transform: [{ rotate: isDurationDropdownOpen ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {isDurationDropdownOpen ? (
                <View className="mt-2 rounded-[10px] border border-border bg-card">
                  {DURATION_OPTIONS.map((option, index) => {
                    const isSelected = durationHours === option.value;
                    const isLast = index === DURATION_OPTIONS.length - 1;
                    return (
                      <Pressable
                        key={option.value}
                        className={cn('px-3 py-3', !isLast && 'border-b border-border')}
                        onPress={() => {
                          setDurationHours(option.value);
                          setIsDurationDropdownOpen(false);
                        }}>
                        <Text
                          className={cn(
                            'text-[15px] font-medium',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-base font-semibold text-foreground">Date of Visit</Text>
            <Pressable
              className="rounded-[10px] border border-border bg-card py-3.5 px-3"
              onPress={() => setShowDatePicker(true)}>
              <Text className="text-[15px] font-medium text-foreground">
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

          {allUsers && allUsers.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-base font-semibold text-foreground">Who visited with you?</Text>
              <View className="flex-row flex-wrap gap-2">
                {allUsers.map((user) => (
                  <Pressable
                    key={user.userId}
                    className={cn(
                      'flex-row items-center gap-1.5 rounded-full border px-3 py-2',
                      selectedFriends.includes(user.userId)
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted'
                    )}
                    onPress={() => toggleFriend(user.userId)}>
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        selectedFriends.includes(user.userId) ? 'text-primary-foreground' : 'text-foreground'
                      )}>
                      {user.name || user.email}
                    </Text>
                    {selectedFriends.includes(user.userId) && (
                      <XIcon size={16} color={RN_API_BACKGROUND_LIGHT} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Pressable
            className={cn(
              'items-center justify-center rounded-[10px] bg-primary py-4 active:opacity-90',
              isSubmitting && 'opacity-60'
            )}
            onPress={handleSubmit}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <BrandActivityIndicator size="small" color={RN_API_BACKGROUND_LIGHT} />
            ) : (
              <Text className="text-base font-semibold text-primary-foreground">Complete Check-In</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}
