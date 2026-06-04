import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Pressable,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useNavigation, router } from 'expo-router';
import {
  ArrowLeftIcon,
  StarIcon,
  MapPinIcon,
  PencilIcon,
  SettingsIcon,
  Sparkles,
  CameraIcon,
  Grid3x3Icon,
  ListIcon,
  BookmarkIcon,
  InfoIcon,
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { EditCheckinModal } from '@/components/edit-checkin-modal';
import { MuseumCard } from '@/components/museum-card';
import { TasteProfileExplainerModal } from '@/components/taste-profile-explainer-modal';
import { useCheckInActions } from '@/hooks/useCheckInActions';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';
import { userProfileHref } from '@/lib/user-profile-navigation';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { useUniwind } from 'uniwind';
import {
  RN_API_FOREGROUND_DARK,
  RN_API_FOREGROUND_LIGHT,
  RN_API_INFO_DARK,
  RN_API_INFO_LIGHT,
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_DARK,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';
import { usePostHog } from 'posthog-react-native';
import { dismissFeatureHint, shouldShowFeatureHint } from '@/lib/feature-hints';

const { width } = Dimensions.get('window');
/** Matches `h-30` banner (30 × 4px). */
const PROFILE_BANNER_HEIGHT = 120;

type TabType = 'visits' | 'gallery' | 'bookmarks';

type ProfileVisit = {
  checkIn: {
    _id: string;
    museumId: string;
    rating?: number;
    visitDate: number;
    createdAt: number;
    review?: string;
    editedAt?: number;
    durationHours?: number;
    friendUserIds?: string[];
    imageIds?: Id<'_storage'>[];
    imageUrls?: string[];
    attendedEventIds?: (Id<'events'> | Id<'exhibitions'>)[];
  };
  museum: { _id: string; name: string; imageUrl?: string; category: string; city?: string };
};

function formatVisitDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PassportCard({
  visit,
  isOwnProfile,
  onEditPress,
}: {
  visit: ProfileVisit;
  isOwnProfile: boolean;
  onEditPress?: () => void;
}) {
  const { theme } = useUniwind();
  const primaryHex = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const mutedHex = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  const { checkIn, museum } = visit;
  const onCardPress = () => router.push(`/(museums)/${museum._id}` as any);

  return (
    <View className="mb-3.5">
      <Pressable
        className="border-border bg-card overflow-hidden rounded-xl border shadow-sm shadow-black/5 active:opacity-95"
        onPress={onCardPress}>
        <View className="flex-row p-3">
          <View className="mr-3.5 h-24 w-24 overflow-hidden rounded-lg">
            {museum.imageUrl ? (
              <Image source={{ uri: museum.imageUrl }} className="size-full" resizeMode="cover" />
            ) : (
              <View className="bg-muted size-full items-center justify-center">
                <Text className="text-muted-foreground text-3xl font-bold">
                  {museum.name ? museum.name[0].toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
          <View className="min-h-24 flex-1 justify-between">
            <View className="mb-1 flex-row items-start justify-between gap-2">
              <Text className="text-foreground flex-1 text-base font-bold" numberOfLines={2}>
                {museum.name}
              </Text>
              {isOwnProfile && onEditPress ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onEditPress();
                  }}
                  className="p-1"
                  hitSlop={8}>
                  <PencilIcon size={18} color={primaryHex} />
                </Pressable>
              ) : null}
            </View>
            {museum.city ? (
              <View className="mb-1.5 flex-row items-center gap-1">
                <MapPinIcon size={12} color={mutedHex} />
                <Text className="text-muted-foreground text-sm">{museum.city}</Text>
              </View>
            ) : null}
            <View className="bg-muted mb-1.5 flex-row items-center self-start rounded-md px-2 py-1">
              <Text className="text-muted-foreground text-xs font-semibold tracking-wide">
                {formatVisitDate(checkIn.visitDate)}
              </Text>
              {checkIn.editedAt != null ? (
                <Text className="text-muted-foreground text-xs italic"> · Edited</Text>
              ) : null}
            </View>
            {checkIn.rating != null ? (
              <View className="flex-row items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    size={14}
                    color={star <= checkIn.rating! ? '#FFB800' : '#D0D0D0'}
                    fill={star <= checkIn.rating! ? '#FFB800' : 'none'}
                  />
                ))}
                <Text className="text-sm font-semibold text-amber-500">
                  {checkIn.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {checkIn.review ? (
              <Text className="text-muted-foreground mt-1 text-sm leading-snug" numberOfLines={2}>
                {checkIn.review}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function MosaicGallery({
  visits,
  onImagePress,
}: {
  visits: ProfileVisit[];
  onImagePress: (visit: ProfileVisit) => void;
}) {
  const { theme } = useUniwind();
  const mutedHex = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  // Collect all images from all visits
  const allImages: Array<{ url: string; visit: ProfileVisit }> = [];

  visits.forEach((visit) => {
    const imageUrls = (visit.checkIn as any).imageUrls || [];
    imageUrls.forEach((url: string) => {
      allImages.push({ url, visit });
    });
  });

  if (allImages.length === 0) {
    return (
      <View className="bg-background flex-1 items-center justify-center p-12">
        <CameraIcon size={48} color={mutedHex} />
        <Text className="text-foreground mt-4 mb-2 text-lg font-bold">No photos yet</Text>
        <Text className="text-muted-foreground text-center text-base">
          Photos from your check-ins will appear here
        </Text>
      </View>
    );
  }

  const GAP = 4;
  const CONTAINER_PADDING = 20;
  const AVAILABLE_WIDTH = width - CONTAINER_PADDING * 2;
  const largeSize = (AVAILABLE_WIDTH - GAP) * 0.66;
  const smallSize = (AVAILABLE_WIDTH - GAP) * 0.34;

  // Create mosaic pattern: alternating between large and small images
  // Pattern: [Large, Small, Small] repeating
  const renderMosaicRows = () => {
    const rows = [];
    let index = 0;

    while (index < allImages.length) {
      const rowImages = allImages.slice(index, index + 3);
      const rowNumber = Math.floor(index / 3);

      // Only render complete rows (3 images) OR the last partial row
      if (rowImages.length === 3 || index + rowImages.length === allImages.length) {
        // Pattern 1: One large on left, two small stacked on right
        if (rowNumber % 2 === 0) {
          rows.push(
            <View key={`row-${index}`} className="mb-1 flex-row" style={{ gap: GAP }}>
              {/* Large image on left */}
              <TouchableOpacity
                onPress={() => onImagePress(rowImages[0].visit)}
                activeOpacity={0.8}
                style={{ width: largeSize, height: largeSize }}>
                <Image
                  source={{ uri: rowImages[0].url }}
                  className="bg-muted size-full rounded-lg"
                  resizeMode="cover"
                />
              </TouchableOpacity>

              {/* Two small images stacked on right */}
              <View className="flex-1" style={{ gap: GAP }}>
                {rowImages[1] && (
                  <TouchableOpacity
                    onPress={() => onImagePress(rowImages[1].visit)}
                    activeOpacity={0.8}
                    style={{ width: smallSize, height: (largeSize - GAP) / 2 }}>
                    <Image
                      source={{ uri: rowImages[1].url }}
                      className="bg-muted size-full rounded-lg"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                {rowImages[2] && (
                  <TouchableOpacity
                    onPress={() => onImagePress(rowImages[2].visit)}
                    activeOpacity={0.8}
                    style={{ width: smallSize, height: (largeSize - GAP) / 2 }}>
                    <Image
                      source={{ uri: rowImages[2].url }}
                      className="bg-muted size-full rounded-lg"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        } else {
          // Pattern 2: Two small stacked on left, one large on right
          rows.push(
            <View key={`row-${index}`} className="mb-1 flex-row" style={{ gap: GAP }}>
              {/* Two small images stacked on left */}
              <View className="flex-1" style={{ gap: GAP }}>
                <TouchableOpacity
                  onPress={() => onImagePress(rowImages[0].visit)}
                  activeOpacity={0.8}
                  style={{ width: smallSize, height: (largeSize - GAP) / 2 }}>
                  <Image
                    source={{ uri: rowImages[0].url }}
                    className="bg-muted size-full rounded-lg"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                {rowImages[1] && (
                  <TouchableOpacity
                    onPress={() => onImagePress(rowImages[1].visit)}
                    activeOpacity={0.8}
                    style={{ width: smallSize, height: (largeSize - GAP) / 2 }}>
                    <Image
                      source={{ uri: rowImages[1].url }}
                      className="bg-muted size-full rounded-lg"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Large image on right */}
              {rowImages[2] && (
                <TouchableOpacity
                  onPress={() => onImagePress(rowImages[2].visit)}
                  activeOpacity={0.8}
                  style={{ width: largeSize, height: largeSize }}>
                  <Image
                    source={{ uri: rowImages[2].url }}
                    className="bg-muted size-full rounded-lg"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        }
      }

      index += 3;
    }

    return rows;
  };

  return (
    <ScrollView
      className="bg-background flex-1"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}>
      {renderMosaicRows()}
    </ScrollView>
  );
}

type ProfileScreenProps = {
  presentation?: 'tab' | 'stack';
  stackUserId?: string;
};

export function ProfileScreen({ presentation = 'tab', stackUserId }: ProfileScreenProps) {
  const isStackPresentation = presentation === 'stack';
  const { userId: paramUserId } = useLocalSearchParams<{
    userId?: string | string[];
  }>();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  const paramUserIdStr = Array.isArray(paramUserId) ? paramUserId[0] : paramUserId;
  const viewedUserId = isStackPresentation
    ? stackUserId ?? null
    : (typeof paramUserIdStr === 'string' && paramUserIdStr ? paramUserIdStr : null) || currentUserId;
  const isViewingOtherProfile = viewedUserId && currentUserId && viewedUserId !== currentUserId;
  const navigation = useNavigation();
  const wasViewingOtherProfileRef = React.useRef(false);

  React.useEffect(() => {
    wasViewingOtherProfileRef.current = Boolean(isViewingOtherProfile);
  }, [isViewingOtherProfile]);

  /** Legacy tab URLs: open other users on the stack screen (no bottom tabs). */
  React.useEffect(() => {
    if (isStackPresentation) return;
    if (!paramUserIdStr || !currentUserId || paramUserIdStr === currentUserId) return;
    router.replace(userProfileHref(paramUserIdStr));
  }, [isStackPresentation, paramUserIdStr, currentUserId]);

  /** Drop ?userId= from the Profile tab when leaving so Home → Explore does not reopen that profile. */
  React.useEffect(() => {
    if (isStackPresentation) return;
    const unsubscribe = navigation.addListener('blur', () => {
      if (!wasViewingOtherProfileRef.current) return;
      router.setParams({ userId: '', search: '' });
    });
    return unsubscribe;
  }, [navigation, isStackPresentation]);

  // Fetch user profile info
  const userProfile = useQuery(api.auth.listUsers, {});
  // Removed redundant saveUserProfile call. Profile upsert now only happens after sign-up.
  const profile = React.useMemo(() => {
    if (!userProfile || !viewedUserId) return null;
    return userProfile.find((u: any) => u.userId === viewedUserId);
  }, [userProfile, viewedUserId]);

  const posthog = usePostHog();

  // Fetch follower/following counts
  const followers = useQuery(
    api.follows.getFollowers,
    viewedUserId ? { userId: viewedUserId } : 'skip'
  );
  const following = useQuery(
    api.follows.getFollowing,
    viewedUserId ? { userId: viewedUserId } : 'skip'
  );
  const isFollowing = useQuery(
    api.follows.isFollowingUser,
    viewedUserId && currentUserId && viewedUserId !== currentUserId
      ? { userId: viewedUserId }
      : 'skip'
  );

  // Fetch follower/following user profiles
  const followersData = useMemo(() => {
    if (!followers || followers.length === 0) return [];
    return followers.map((id) => userProfile?.find((u: any) => u.userId === id)).filter(Boolean);
  }, [followers, userProfile]);

  const followingData = useMemo(() => {
    if (!following || following.length === 0) return [];
    return following.map((id) => userProfile?.find((u: any) => u.userId === id)).filter(Boolean);
  }, [following, userProfile]);

  // Cultural passport: visits for the profile being viewed
  const profileVisits = useQuery(
    api.checkIns.getProfileVisits,
    viewedUserId ? { userId: viewedUserId } : 'skip'
  );

  // Taste profile (for display next to name)
  const tasteProfile = useQuery(
    api.wrapped.getTasteProfileForUser,
    viewedUserId ? { userId: viewedUserId } : 'skip'
  );

  // Bookmarks (only for current user's own profile)
  const bookmarks = useQuery(
    api.bookmarks.getBookmarks,
    viewedUserId === currentUserId ? {} : 'skip'
  );

  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);
  const generateUploadUrl = useMutation(api.userProfiles.generateUploadUrl);
  const updateProfileImage = useMutation(api.userProfiles.updateProfileImage);
  const updateBannerImage = useMutation(api.userProfiles.updateBannerImage);

  const [editingVisit, setEditingVisit] = useState<ProfileVisit | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('visits');
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [showTasteProfileModal, setShowTasteProfileModal] = useState(false);
  const [showWrappedHint, setShowWrappedHint] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingVisit(null));
  const isWrappedEligible = !isViewingOtherProfile && !!profileVisits && profileVisits.length >= 3;

  useEffect(() => {
    if (!currentUserId || !isWrappedEligible) {
      setShowWrappedHint(false);
      return;
    }
    let isActive = true;

    const run = async () => {
      try {
        const shouldShow = await shouldShowFeatureHint(currentUserId, 'profile_wrapped');
        if (!isActive) return;
        setShowWrappedHint(shouldShow);
      } catch {
        if (!isActive) return;
        setShowWrappedHint(false);
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [currentUserId, isWrappedEligible]);

  const dismissWrappedHint = React.useCallback(async () => {
    if (!currentUserId) return;
    setShowWrappedHint(false);
    try {
      await dismissFeatureHint(currentUserId, 'profile_wrapped');
    } catch {
      // Non-blocking persistence failure.
    }
  }, [currentUserId]);

  const MAX_AVATAR_DIMENSION = 512;
  const MAX_BANNER_WIDTH = 1200;

  const pickAndUploadImage = async (type: 'avatar' | 'banner') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      // Initial picker quality; final compression is handled by ImageManipulator below.
      quality: 0.6,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    try {
      if (type === 'avatar') setUploadingAvatar(true);
      else setUploadingBanner(true);

      // Resize and compress image before upload to enforce size limits.
      const { width: originalWidth, height: originalHeight, uri: originalUri } = asset;

      const actions: ImageManipulator.Action[] = [];

      if (type === 'avatar') {
        if (originalWidth && originalHeight) {
          const maxSide = Math.max(originalWidth, originalHeight);
          if (maxSide > MAX_AVATAR_DIMENSION) {
            const scale = MAX_AVATAR_DIMENSION / maxSide;
            actions.push({
              resize: {
                width: Math.round(originalWidth * scale),
                height: Math.round(originalHeight * scale),
              },
            });
          }
        } else {
          actions.push({
            resize: {
              width: MAX_AVATAR_DIMENSION,
              height: MAX_AVATAR_DIMENSION,
            },
          });
        }
      } else {
        if (originalWidth && originalWidth > MAX_BANNER_WIDTH && originalHeight) {
          const scale = MAX_BANNER_WIDTH / originalWidth;
          actions.push({
            resize: {
              width: MAX_BANNER_WIDTH,
              height: Math.round(originalHeight * scale),
            },
          });
        } else if (!originalWidth || !originalHeight) {
          actions.push({
            resize: {
              width: MAX_BANNER_WIDTH,
              height: MAX_BANNER_WIDTH,
            },
          });
        }
      }

      const manipulated = await ImageManipulator.manipulateAsync(originalUri, actions, {
        compress: type === 'avatar' ? 0.5 : 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: await (await fetch(manipulated.uri)).blob(),
      });
      const { storageId } = await response.json();

      if (type === 'avatar') {
        await updateProfileImage({ storageId });
      } else {
        await updateBannerImage({ storageId });
      }
    } catch {
      Alert.alert('Upload failed', 'Something went wrong. Please try again.');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const handleFollow = async () => {
    if (!viewedUserId) return;
    await followUser({ userId: viewedUserId });
  };
  const handleUnfollow = async () => {
    if (!viewedUserId) return;
    await unfollowUser({ userId: viewedUserId });
  };

  const FALLBACK_DISPLAY_NAME = "Name can't be displayed";
  // Own profile: use current user's name/email from auth; else profile. Other users: name only (never show their email).
  const rawDisplayName =
    viewedUserId === currentUserId
      ? (currentUser?.name ??
        currentUser?.email ??
        profile?.name ??
        profile?.email ??
        FALLBACK_DISPLAY_NAME)
      : (profile?.name ?? FALLBACK_DISPLAY_NAME);
  // Never show trailing " 2", " 3", etc. (e.g. from auth duplicate-name handling)
  const displayName =
    typeof rawDisplayName === 'string'
      ? rawDisplayName.replace(/\s+\d+$/, '').trim() || FALLBACK_DISPLAY_NAME
      : FALLBACK_DISPLAY_NAME;

  const handleBack = () => {
    if (isStackPresentation) {
      router.back();
      return;
    }
    router.replace('/(tabs)/explore?tab=people');
  };

  const { theme } = useUniwind();
  const fgHex = theme === 'dark' ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const primaryHex = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const infoHex = theme === 'dark' ? RN_API_INFO_DARK : RN_API_INFO_LIGHT;
  const mutedHex = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  const insets = useSafeAreaInsets();
  /** Own profile: bleed banner under status bar / Dynamic Island; other profile: back row sits in safe area. */
  const bannerBleedStyle =
    !isViewingOtherProfile && insets.top > 0
      ? { height: PROFILE_BANNER_HEIGHT + insets.top }
      : { height: PROFILE_BANNER_HEIGHT };

  return (
    <SafeAreaView
      className="bg-background flex-1"
      style={{ flex: 1 }}
      edges={['top', 'left', 'right']}>
      {isStackPresentation ? (
        <ScreenTitleBar title={displayName} onBackPress={handleBack} />
      ) : null}
      <Pressable
        className="flex-1"
        style={{ flex: 1 }}
        onPress={() => showSettingsDropdown && setShowSettingsDropdown(false)}>
        {isViewingOtherProfile && !isStackPresentation ? (
          <View className="bg-background flex-row items-center px-3 pt-3 pb-2">
            <TouchableOpacity
              className="p-2"
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeftIcon size={24} color={fgHex} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="border-border bg-background border-b">
          {/* Banner Image */}
          <TouchableOpacity
            onPress={!isViewingOtherProfile ? () => pickAndUploadImage('banner') : undefined}
            activeOpacity={!isViewingOtherProfile ? 0.85 : 1}
            disabled={!!isViewingOtherProfile}
            style={!isViewingOtherProfile ? { marginTop: -insets.top } : undefined}>
            <ImageBackground
              source={
                profile?.bannerUrl
                  ? { uri: profile.bannerUrl }
                  : require('@/assets/images/login-background.jpg')
              }
              className="w-full"
              style={bannerBleedStyle}
              imageStyle={{ resizeMode: 'cover' }}
              resizeMode="cover">
              <View className="absolute inset-0 bg-black/20" />
              {!isViewingOtherProfile && (
                <View className="absolute right-2 bottom-2 rounded-xl bg-black/45 p-1.5">
                  {uploadingBanner ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <CameraIcon size={16} color="#fff" />
                  )}
                </View>
              )}
            </ImageBackground>
          </TouchableOpacity>

          {/* Profile Content */}
          <View className="px-5 pt-0 pb-3">
            <View className="-mt-10 mb-3 flex-row items-start justify-between">
              {/* Avatar */}
              <TouchableOpacity
                className="border-background rounded-full border-4"
                onPress={!isViewingOtherProfile ? () => pickAndUploadImage('avatar') : undefined}
                activeOpacity={!isViewingOtherProfile ? 0.85 : 1}
                disabled={!!isViewingOtherProfile}>
                {uploadingAvatar ? (
                  <View className="bg-primary size-20 items-center justify-center rounded-full opacity-70">
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : profile?.imageUrl ? (
                  <Image
                    source={{ uri: profile.imageUrl }}
                    className="bg-primary/20 size-20 rounded-full"
                  />
                ) : (
                  <View className="bg-primary size-20 items-center justify-center rounded-full">
                    <Text className="text-primary-foreground text-4xl font-semibold">
                      {(displayName && displayName !== FALLBACK_DISPLAY_NAME
                        ? displayName[0]
                        : '?'
                      ).toUpperCase()}
                    </Text>
                  </View>
                )}
                {!isViewingOtherProfile && !uploadingAvatar && (
                  <View className="border-background bg-primary absolute right-0 bottom-0 size-5 items-center justify-center rounded-full border-2">
                    <CameraIcon size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Settings Icon or Follow/Unfollow Button - Top Right */}
              {!isViewingOtherProfile ? (
                <View>
                  <TouchableOpacity
                    className="border-border bg-background mt-12 size-9 items-center justify-center rounded-full border"
                    onPress={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <SettingsIcon size={20} color={fgHex} />
                  </TouchableOpacity>

                  {showSettingsDropdown && (
                    <View className="border-border bg-card absolute top-22 right-0 z-1000 min-w-40 rounded-lg border shadow-md">
                      <TouchableOpacity
                        className="px-4 py-3"
                        onPress={() => {
                          setShowSettingsDropdown(false);
                          router.push('/profile-settings');
                        }}>
                        <Text className="text-foreground text-sm font-medium">Settings</Text>
                      </TouchableOpacity>
                      <View className="bg-border my-1 h-px" />
                      <TouchableOpacity
                        className="px-4 py-3"
                        onPress={async () => {
                          setShowSettingsDropdown(false);
                          const { authClient } = await import('@/lib/auth-client');
                          await authClient.signOut();
                          router.replace('/sign-in');
                        }}>
                        <Text className="text-destructive text-sm font-medium">Log out</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  className="mt-12 rounded-lg px-5 py-2"
                  onPress={isFollowing ? handleUnfollow : handleFollow}>
                  <Text className="text-sm font-semibold">
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Text>
                </Button>
              )}
            </View>

            {/* Name and Taste profile badge */}
            <View className="mb-2">
              <View className="mb-0.5 flex-row flex-wrap items-center gap-2">
                <Text
                  className="text-foreground max-w-3/5 shrink text-2xl font-semibold"
                  numberOfLines={1}>
                  {displayName}
                </Text>
                {tasteProfile?.profileName ? (
                  <TouchableOpacity
                    className="bg-primary/15 flex-row items-center gap-1 rounded-xl px-2.5 py-1 active:opacity-80"
                    onPress={() => setShowTasteProfileModal(true)}
                    activeOpacity={0.7}>
                    <Text className="text-primary text-sm font-semibold">
                      {tasteProfile.profileName}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {isWrappedEligible ? (
                  <TouchableOpacity
                    className="bg-primary flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5 active:opacity-90"
                    onPress={() => {
                      posthog?.capture('wrapped_click', {});
                      if (showWrappedHint) void dismissWrappedHint();
                      router.push('/wrapped');
                    }}
                    activeOpacity={0.8}>
                    <Sparkles size={14} color="#FFFFFF" />
                    <Text className="text-primary-foreground text-sm font-bold">Wrapped</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {profile?.username ? (
                <Text className="text-muted-foreground mb-1 text-sm">@{profile.username}</Text>
              {showWrappedHint ? (
                <View className="mt-3 mb-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-3 dark:border-blue-800/70 dark:bg-blue-950/40">
                  <View className="flex-row items-start gap-2">
                    <View className="mt-0.5">
                      <InfoIcon size={14} color={infoHex} />
                    </View>
                    <Text className="flex-1 text-xs leading-5 text-blue-900 dark:text-blue-100">
                      Your Wrapped has been curated. Tap in to see your highlights!
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss wrapped hint"
                      onPress={() => void dismissWrappedHint()}
                      className="shrink-0">
                      <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {viewedUserId === currentUserId && (currentUser?.email || profile?.email) && (
                <Text className="text-muted-foreground mb-2 text-sm">
                  {currentUser?.email ?? profile?.email}
                </Text>
              )}

              <View className="mt-1 flex-row gap-4">
                <Pressable
                  onPress={() =>
                    viewedUserId === currentUserId &&
                    followers &&
                    followers.length > 0 &&
                    setShowFollowModal('followers')
                  }
                  disabled={viewedUserId !== currentUserId}>
                  <Text className="text-sm">
                    <Text className="text-foreground text-sm font-bold">
                      {followers ? followers.length : '0'}
                    </Text>
                    <Text className="text-muted-foreground text-sm"> Followers</Text>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    viewedUserId === currentUserId &&
                    following &&
                    following.length > 0 &&
                    setShowFollowModal('following')
                  }
                  disabled={viewedUserId !== currentUserId}>
                  <Text className="text-sm">
                    <Text className="text-foreground text-sm font-bold">
                      {following ? following.length : '0'}
                    </Text>
                    <Text className="text-muted-foreground text-sm"> Following</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {viewedUserId && (
          <View className="border-border bg-background flex-row border-b px-5">
            <TouchableOpacity
              className={cn(
                'flex-1 items-center justify-center border-b-2 py-3.5',
                activeTab === 'visits' ? 'border-primary' : 'border-transparent'
              )}
              onPress={() => setActiveTab('visits')}
              activeOpacity={0.7}>
              <ListIcon size={22} color={activeTab === 'visits' ? primaryHex : mutedHex} />
            </TouchableOpacity>
            <TouchableOpacity
              className={cn(
                'flex-1 items-center justify-center border-b-2 py-3.5',
                activeTab === 'gallery' ? 'border-primary' : 'border-transparent'
              )}
              onPress={() => setActiveTab('gallery')}
              activeOpacity={0.7}>
              <Grid3x3Icon size={22} color={activeTab === 'gallery' ? primaryHex : mutedHex} />
            </TouchableOpacity>
            {viewedUserId === currentUserId && (
              <TouchableOpacity
                className={cn(
                  'flex-1 items-center justify-center border-b-2 py-3.5',
                  activeTab === 'bookmarks' ? 'border-primary' : 'border-transparent'
                )}
                onPress={() => setActiveTab('bookmarks')}
                activeOpacity={0.7}>
                <BookmarkIcon size={22} color={activeTab === 'bookmarks' ? primaryHex : mutedHex} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {viewedUserId ? (
          profileVisits === undefined ? (
            <View className="bg-background flex-1 items-center justify-center p-6">
              <BrandActivityIndicator size="large" />
              <Text variant="muted" className="mt-3 text-base">
                Loading...
              </Text>
            </View>
          ) : profileVisits.length === 0 ? (
            <View className="bg-background flex-1 items-center justify-center p-8">
              <Text className="text-foreground mb-2 text-lg font-bold">
                {viewedUserId === currentUserId ? 'No visits yet' : 'No visits'}
              </Text>
              <Text className="text-muted-foreground mb-5 text-center text-base">
                {viewedUserId === currentUserId
                  ? 'Check in at a museum to start your passport.'
                  : 'This user has not checked in anywhere yet.'}
              </Text>
              {viewedUserId === currentUserId && (
                <Button variant="secondary" onPress={() => router.push('/(tabs)/explore')}>
                  <Text>Explore museums</Text>
                </Button>
              )}
            </View>
          ) : activeTab === 'visits' ? (
            <FlatList
              className="bg-background flex-1"
              data={profileVisits}
              keyExtractor={(item) => item.checkIn._id}
              renderItem={({ item }) => (
                <PassportCard
                  visit={item}
                  isOwnProfile={viewedUserId === currentUserId}
                  onEditPress={
                    viewedUserId === currentUserId ? () => setEditingVisit(item) : undefined
                  }
                />
              )}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View className="bg-background px-5 pt-4 pb-2">
                  <Text variant="muted" className="mt-0.5 text-sm">
                    {profileVisits.length} visit{profileVisits.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              }
            />
          ) : activeTab === 'gallery' ? (
            <MosaicGallery
              visits={profileVisits}
              onImagePress={(visit) => router.push(`/(museums)/${visit.museum._id}` as any)}
            />
          ) : activeTab === 'bookmarks' ? (
            bookmarks === undefined ? (
              <BrandActivityIndicator size="large" className="flex-1" />
            ) : bookmarks && bookmarks.length > 0 ? (
              <FlatList
                className="bg-background flex-1"
                data={bookmarks}
                keyExtractor={(item) => item.museumId}
                renderItem={({ item }) =>
                  item.museum ? <MuseumCard museum={item.museum} /> : null
                }
                contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View className="bg-background px-5 pt-4 pb-2">
                    <Text variant="muted" className="mt-0.5 text-sm">
                      {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                }
              />
            ) : (
              <View className="bg-background flex-1 items-center justify-center p-8">
                <Text className="text-foreground mb-2 text-lg font-bold">No bookmarks yet</Text>
                <Text className="text-muted-foreground mb-5 text-center text-base">
                  Bookmark museums you want to visit later.
                </Text>
                <Button variant="secondary" onPress={() => router.push('/(tabs)/explore')}>
                  <Text>Explore museums</Text>
                </Button>
              </View>
            )
          ) : null
        ) : null}

        <EditCheckinModal
          visible={editingVisit != null}
          checkInId={editingVisit?.checkIn._id as Id<'checkIns'> | null}
          museumId={editingVisit?.checkIn.museumId as Id<'museums'> | undefined}
          initialRating={editingVisit?.checkIn.rating ?? null}
          initialReview={editingVisit?.checkIn.review}
          initialImageUrls={editingVisit?.checkIn.imageUrls}
          initialImageIds={editingVisit?.checkIn.imageIds}
          initialFriendUserIds={editingVisit?.checkIn.friendUserIds}
          initialDurationHours={editingVisit?.checkIn.durationHours}
          initialVisitDate={editingVisit?.checkIn.visitDate}
          initialAttendedEventIds={editingVisit?.checkIn.attendedEventIds}
          onSave={saveCheckIn}
          onDelete={() => editingVisit && deleteCheckIn(editingVisit.checkIn._id as Id<'checkIns'>)}
          onClose={() => setEditingVisit(null)}
        />

        {/* Followers/Following Modal */}
        {showFollowModal && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowFollowModal(null)}>
            <Pressable
              className="flex-1 items-center justify-center bg-black/50"
              onPress={() => setShowFollowModal(null)}>
              <Pressable
                className="border-border bg-card max-h-[50%] w-4/5 rounded-2xl border"
                onPress={(e) => e.stopPropagation()}>
                <View className="border-border flex-row items-center justify-between border-b px-5 py-4">
                  <Text className="text-foreground text-lg font-semibold">
                    {showFollowModal === 'followers' ? 'Followers' : 'Following'}
                  </Text>
                  <Pressable
                    onPress={() => setShowFollowModal(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text className="text-muted-foreground text-2xl font-bold">×</Text>
                  </Pressable>
                </View>
                <FlatList
                  data={showFollowModal === 'followers' ? followersData : followingData}
                  renderItem={({ item, index }) => {
                    if (!item) return null;
                    const rawName = item.name || item.email || '';
                    const displayNameForModal =
                      typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
                    const initial = (
                      displayNameForModal && displayNameForModal !== "Name can't be displayed"
                        ? displayNameForModal[0]
                        : '?'
                    ).toUpperCase();
                    const listData =
                      showFollowModal === 'followers' ? followersData : followingData;
                    return (
                      <Pressable
                        className="active:bg-muted flex-row items-center gap-3 px-5 py-3"
                        onPress={() => {
                          setShowFollowModal(null);
                      router.push(userProfileHref(item.userId));
                        }}>
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} className="size-12 rounded-full" />
                        ) : (
                          <View className="bg-primary size-12 items-center justify-center rounded-full">
                            <Text className="text-primary-foreground text-base font-semibold">
                              {initial}
                            </Text>
                          </View>
                        )}
                        <Text
                          className="text-foreground flex-1 text-base font-medium"
                          numberOfLines={1}>
                          {displayNameForModal || "Name can't be displayed"}
                        </Text>
                      </Pressable>
                    );
                  }}
                  keyExtractor={(item) => item?.userId || ''}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}

        <TasteProfileExplainerModal
          visible={showTasteProfileModal && !!tasteProfile?.profileName}
          profileName={tasteProfile?.profileName ?? ''}
          onClose={() => setShowTasteProfileModal(false)}
        />
      </Pressable>
    </SafeAreaView>
  );
}

export default function TabProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileScreen presentation="tab" />
    </>
  );
}
