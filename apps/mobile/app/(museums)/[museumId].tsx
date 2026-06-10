import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  FlatList,
  Image,
  Modal,
  Linking,
  Alert,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router, type Href } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { usePostHog } from 'posthog-react-native';
import { useUniwind } from 'uniwind';
import * as Clipboard from 'expo-clipboard';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import {
  ScanSearchIcon,
  MapPinIcon,
  HeartIcon,
  CheckCircle2Icon,
  PencilIcon,
  StarIcon,
  BookmarkIcon,
  ImagesIcon,
  ExternalLinkIcon,
} from 'lucide-react-native';
import { CategoryTag } from '../../components/category-tag';
import { EventCard, EventCardData } from '../../components/event-card';
import { EditCheckinModal } from '../../components/edit-checkin-modal';
import { useCheckInActions } from '../../hooks/useCheckInActions';
import { useBookmark } from '../../hooks/useBookmark';
import { AuthGuard } from '@/components/AuthGuard';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';
import { UserCheckInList, UserCheckIn } from '../../components/user-checkin-list';
import { ScreenTitleBar } from '@/components/ui/screen-title-bar';
import { userProfileHref } from '@/lib/user-profile-navigation';
import {
  RN_API_BORDER_LIGHT,
  RN_API_FOREGROUND_LIGHT,
  RN_API_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_LIGHT,
  RN_API_BACKGROUND_LIGHT,
  RN_API_BACKGROUND_DARK,
} from '@/constants/rn-api-colors';

const TAB_ROUTE_SEGMENTS = new Set(['tabs', 'index', 'home', 'explore', 'profile']);

type MuseumTab = 'about' | 'reviews';
function normalizeExternalUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

type MuseumGalleryImage = {
  _id: Id<'museumImages'> | string;
  imageUrl: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

type OfficialPhotoItem = {
  id: string;
  imageUrl: string;
  alt?: string;
  isPrimary: boolean;
};

function OfficialPhotoCarousel({
  museumName,
  photos,
  width,
  onPreview,
  onImageError,
}: {
  museumName: string;
  photos: OfficialPhotoItem[];
  width: number;
  onPreview: (imageUrl: string) => void;
  onImageError: (imageUrl: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<OfficialPhotoItem>>(null);
  const hasMultiplePhotos = photos.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [museumName, photos.length]);

  const handleThumbnailPress = (index: number) => {
    setActiveIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, photos.length - 1)));
  };

  return (
    <View className="mb-3 overflow-hidden rounded-[22px] bg-muted">
      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <Pressable
            className="h-[220px] justify-end overflow-hidden bg-muted active:opacity-95"
            style={{ width }}
            onPress={() => onPreview(item.imageUrl)}>
            <Image
              source={{ uri: item.imageUrl }}
              className="absolute inset-0 size-full"
              resizeMode="cover"
              accessibilityLabel={item.alt ?? museumName}
              onError={() => onImageError(item.imageUrl)}
            />
            <View className="absolute inset-0 bg-black/30" />
            <View className="px-4 pb-4">
              <Text className="text-2xl font-bold text-white" numberOfLines={2}>
                {museumName}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <View className="absolute right-3 top-3 flex-row items-center gap-2 rounded-full bg-black/50 px-3 py-1.5">
        <ImagesIcon size={14} color="#ffffff" />
        <Text className="text-xs font-semibold text-white">
          {activeIndex + 1}/{photos.length}
        </Text>
      </View>

      {hasMultiplePhotos ? (
        <View className="absolute bottom-3 right-3 flex-row gap-1.5">
          {photos.map((photo, index) => (
            <View
              key={photo.id}
              className={cn(
                'h-1.5 rounded-full bg-white',
                index === activeIndex ? 'w-5 opacity-95' : 'w-1.5 opacity-45'
              )}
            />
          ))}
        </View>
      ) : null}

      {hasMultiplePhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="bg-card"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}>
          {photos.map((photo, index) => (
            <Pressable
              key={`thumb-${photo.id}`}
              className={cn(
                'overflow-hidden rounded-[10px] border-2 bg-muted active:opacity-80',
                index === activeIndex ? 'border-primary' : 'border-transparent'
              )}
              onPress={() => handleThumbnailPress(index)}>
              <Image
                source={{ uri: photo.imageUrl }}
                className="size-[58px]"
                resizeMode="cover"
                accessibilityLabel={photo.alt ?? museumName}
                onError={() => onImageError(photo.imageUrl)}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

type GoogleMapsReview = {
  _id: string;
  authorName?: string;
  rating: number;
  text?: string;
  originalText?: string;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  googleMapsUri?: string;
};

function getGoogleReviewDateLabel(review: GoogleMapsReview) {
  if (review.relativePublishTimeDescription) return review.relativePublishTimeDescription;
  if (!review.publishTime) return null;
  const timestamp = Date.parse(review.publishTime);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toLocaleDateString();
}

function GoogleMapsReviewsSection({
  reviews,
  googleRating,
  googleUserRatingCount,
  googleMapsUri,
}: {
  reviews: GoogleMapsReview[];
  googleRating?: number;
  googleUserRatingCount?: number;
  googleMapsUri?: string;
}) {
  const { theme } = useUniwind();
  const sourceIconColor = theme === 'dark' ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const sourceUrl = googleMapsUri ?? reviews.find((review) => review.googleMapsUri)?.googleMapsUri;
  const ratingLabel = typeof googleRating === 'number' ? googleRating.toFixed(1) : null;
  const ratingCountLabel =
    typeof googleUserRatingCount === 'number' ? googleUserRatingCount.toLocaleString() : null;

  const handleOpenGoogleMaps = async () => {
    if (!sourceUrl) return;
    try {
      await Linking.openURL(sourceUrl);
    } catch {
      Alert.alert('Unable to open Google Maps', 'Please try again.');
    }
  };

  return (
    <View className="mb-5 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="mb-1 flex-row items-center gap-2">
            <Text className="text-base font-semibold text-foreground">Google Maps reviews</Text>
            <View className="rounded-full bg-muted px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-muted-foreground">Google Maps</Text>
            </View>
          </View>
          {ratingLabel ? (
            <Text className="text-sm text-muted-foreground">
              {ratingLabel} rating
              {ratingCountLabel ? ` from ${ratingCountLabel} ratings` : ''}
            </Text>
          ) : null}
        </View>
        {sourceUrl ? (
          <Pressable
            className="flex-row items-center gap-1 rounded-full bg-muted px-3 py-1.5 active:opacity-75"
            onPress={handleOpenGoogleMaps}>
            <ExternalLinkIcon size={13} color={sourceIconColor} />
            <Text className="text-xs font-semibold text-foreground">Open</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3 gap-3">
        {reviews.map((review, index) => {
          const reviewText = review.text ?? review.originalText;
          const dateLabel = getGoogleReviewDateLabel(review);
          return (
            <View
              key={review._id}
              className={cn(index === 0 ? '' : 'border-t border-border pt-3')}>
              <View className="mb-1.5 flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {review.authorName ?? 'Google Maps user'}
                  </Text>
                  {dateLabel ? (
                    <Text className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      size={13}
                      color={star <= Math.round(review.rating) ? RN_API_PRIMARY_LIGHT : RN_API_BORDER_LIGHT}
                      fill={star <= Math.round(review.rating) ? RN_API_PRIMARY_LIGHT : 'none'}
                    />
                  ))}
                  <Text className="ml-1 text-xs font-semibold text-primary">{review.rating.toFixed(1)}</Text>
                </View>
              </View>
              {reviewText ? (
                <Text className="text-sm leading-5 text-muted-foreground">{reviewText}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MuseumDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { theme } = useUniwind();
  const bookmarkIconColor = theme === 'dark' ? RN_API_BACKGROUND_DARK : RN_API_BACKGROUND_LIGHT;
  const bookmarkUnselectedIconColor = theme === 'dark' ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const followIconColor = theme === 'dark' ? RN_API_BACKGROUND_DARK : RN_API_BACKGROUND_LIGHT;
    const notFollowIconColor = theme === 'dark' ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const params = useLocalSearchParams<{ museumId: string; tab?: string; highlight?: string }>();
  const museumIdParam = params.museumId;
  const id = typeof museumIdParam === 'string' ? museumIdParam : Array.isArray(museumIdParam) ? museumIdParam[0] : undefined;
  const tabParam = typeof params.tab === 'string' ? params.tab : Array.isArray(params.tab) ? params.tab[0] : undefined;
  const highlightId = typeof params.highlight === 'string' ? params.highlight : Array.isArray(params.highlight) ? params.highlight[0] : undefined;

  // If this route was hit with a tab segment (e.g. from redirect), go to home
  useEffect(() => {
    if (id && TAB_ROUTE_SEGMENTS.has(id)) {
      router.replace('/(tabs)/home');
    }
  }, [id]);

  const isTabSegment = id != null && TAB_ROUTE_SEGMENTS.has(id);
  const effectiveId = isTabSegment ? undefined : id;

  // Tab state: about | reviews (initial from URL)
  const [activeTab, setActiveTab] = useState<MuseumTab>(() => {
    if (tabParam === 'reviews') return 'reviews';
    return 'about';
  });
  useEffect(() => {
    if (tabParam === 'reviews') setActiveTab('reviews');
    else if (tabParam === 'about') setActiveTab('about');
  }, [tabParam]);

  // Fetch museum from Convex (skip when param is a tab segment)
  const museum = useQuery(api.museums.getMuseum, 
    effectiveId ? { id: effectiveId as Id<"museums"> } : "skip"
  );
  const museumImages = useQuery(
    api.museums.listMuseumImagesForMuseum,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  ) as MuseumGalleryImage[] | undefined;
  
  // Fetch events for this museum
  const events = useQuery(api.events.getEventsByMuseum, 
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );

  // Reviews for this museum (with user info)
  const reviews = useQuery(api.checkIns.getMuseumCheckInsWithUsers,
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );
  const googleReviews = useQuery(
    api.museums.listGoogleReviewsForMuseum,
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );
  const reviewsListRef = useRef<FlatList>(null);
  const highlightIndex = useMemo(() => {
    if (!highlightId || !reviews?.length) return -1;
    const idx = reviews.findIndex((r) => r._id === highlightId);
    return idx >= 0 ? idx : -1;
  }, [reviews, highlightId]);
  useEffect(() => {
    if (activeTab === 'reviews' && highlightIndex >= 0 && reviewsListRef.current) {
      reviewsListRef.current.scrollToIndex({ index: highlightIndex, animated: true });
    }
  }, [activeTab, highlightIndex]);
  const exhibitions = useQuery(
    api.exhibitions.listPublicExhibitionsByMuseum,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );

  // Fetch all check-ins for this museum (for visitor photo gallery)
  const museumCheckIns = useQuery(
    api.checkIns.getMuseumCheckIns,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );
  const activeVisualSearchMuseums = useQuery(api.visualSearch.listVisualSearchActiveMuseums);
  const visualSearchAssignment = useMemo(() => {
    if (!effectiveId || !activeVisualSearchMuseums) return null;
    return (
      activeVisualSearchMuseums.find(
        (assignment) => String(assignment.museumId) === effectiveId
      ) ?? null
    );
  }, [activeVisualSearchMuseums, effectiveId]);
  
  // Check if user follows this museum
  const isFollowing = useQuery(api.follows.isFollowing, 
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );

  // Check if user has bookmarked this museum
  const { isBookmarked, toggleBookmark } = useBookmark(
    effectiveId ? (effectiveId as Id<"museums">) : ("" as Id<"museums">)
  );

  // Current user and their check-ins at this museum
  const currentUser = useQuery(api.auth.getCurrentUser);
  const userCheckIns = useQuery(
    api.checkIns.getUserMuseumCheckIns,
    effectiveId && currentUser ? { userId: currentUser._id, museumId: effectiveId as Id<'museums'> } : 'skip'
  );
  
  // Sort check-ins by visit date (most recent first)
  const sortedUserCheckIns = useMemo(() => {
    if (!userCheckIns || userCheckIns.length === 0) return [];
    return [...userCheckIns].sort((a, b) =>
      (b.visitDate ?? b.createdAt) - (a.visitDate ?? a.createdAt)
    );
  }, [userCheckIns]);
  const hasVisitedBefore = sortedUserCheckIns.length > 0;

  const museumCheckInPhotoUrls = useMemo(() => {
    if (!museumCheckIns || museumCheckIns.length === 0) return [];

    const sorted = [...museumCheckIns].sort((a, b) => b.createdAt - a.createdAt);
    const photoUrls: string[] = [];

    for (const checkIn of sorted as Array<{ imageUrls?: string[] }>) {
      if (Array.isArray(checkIn.imageUrls) && checkIn.imageUrls.length > 0) {
        photoUrls.push(...checkIn.imageUrls);
      }
      if (photoUrls.length >= 12) break;
    }

    return photoUrls.slice(0, 12);
  }, [museumCheckIns]);

  const [editingCheckIn, setEditingCheckIn] = useState<UserCheckIn | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [failedOfficialPhotoUrls, setFailedOfficialPhotoUrls] = useState<Set<string>>(() => new Set());
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckIn(null));

  useEffect(() => {
    setShowMoreDetails(false);
    setFailedOfficialPhotoUrls(new Set());
  }, [effectiveId]);

  const officialPhotoItems = useMemo(() => {
    if (!museum) return [];

    const itemsByUrl = new Map<string, OfficialPhotoItem>();
    const addPhoto = (photo: OfficialPhotoItem) => {
      if (!photo.imageUrl || failedOfficialPhotoUrls.has(photo.imageUrl)) return;
      const existing = itemsByUrl.get(photo.imageUrl);
      if (existing) {
        itemsByUrl.set(photo.imageUrl, {
          ...existing,
          isPrimary: existing.isPrimary || photo.isPrimary,
          alt: existing.alt ?? photo.alt,
        });
        return;
      }
      itemsByUrl.set(photo.imageUrl, photo);
    };

    if (museum.imageUrl) {
      addPhoto({
        id: `primary-${museum.imageUrl}`,
        imageUrl: museum.imageUrl,
        alt: museum.name,
        isPrimary: true,
      });
    }

    const sortedMuseumImages = [...(museumImages ?? [])].sort((left, right) => {
      if (left.isPrimary && !right.isPrimary) return -1;
      if (!left.isPrimary && right.isPrimary) return 1;
      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    });

    for (const image of sortedMuseumImages) {
      addPhoto({
        id: String(image._id),
        imageUrl: image.imageUrl,
        alt: image.alt ?? museum.name,
        isPrimary: Boolean(image.isPrimary || image.imageUrl === museum.imageUrl),
      });
    }

    return Array.from(itemsByUrl.values()).sort((left, right) => {
      if (left.isPrimary && !right.isPrimary) return -1;
      if (!left.isPrimary && right.isPrimary) return 1;
      return 0;
    });
  }, [failedOfficialPhotoUrls, museum, museumImages]);

  const carouselWidth = Math.max(280, windowWidth - 40);

  const handleOfficialPhotoError = React.useCallback((imageUrl: string) => {
    setFailedOfficialPhotoUrls((current) => {
      if (current.has(imageUrl)) return current;
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }, []);

  const { upcomingItems, ongoingItems } = useMemo(() => {
    if (!events || !exhibitions) {
      return { upcomingItems: [] as EventCardData[], ongoingItems: [] as EventCardData[] };
    }

    const now = Date.now();
    const merged: EventCardData[] = [
      ...events.map((event) => ({
        _id: String(event._id),
        title: event.title,
        description: event.description,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        imageUrl: event.imageUrl,
        kind: 'event' as const,
        museumId: event.museumId ? String(event.museumId) : id,
      })),
      ...exhibitions.map((exhibition) => ({
        _id: String(exhibition._id),
        title: exhibition.name,
        description: exhibition.description,
        category: 'Exhibition',
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        imageUrl: exhibition.imageUrl,
        kind: 'exhibition' as const,
        museumId: String(exhibition.museumId),
      })),
    ];

    const upcoming = merged.filter((item) => item.startDate != null && item.startDate > now);
    const ongoing = merged.filter((item) => {
      const hasStarted = item.startDate == null || item.startDate <= now;
      const hasNotEnded = item.endDate == null || item.endDate >= now;
      return hasStarted && hasNotEnded;
    });

    upcoming.sort(
      (a, b) => (a.startDate ?? Number.MAX_SAFE_INTEGER) - (b.startDate ?? Number.MAX_SAFE_INTEGER)
    );
    ongoing.sort(
      (a, b) => (a.endDate ?? Number.MAX_SAFE_INTEGER) - (b.endDate ?? Number.MAX_SAFE_INTEGER)
    );

    return { upcomingItems: upcoming, ongoingItems: ongoing };
  }, [events, exhibitions, id]);
  
  // Follow/unfollow mutations
  const followMuseum = useMutation(api.follows.followMuseum);
  const unfollowMuseum = useMutation(api.follows.unfollowMuseum);

  const handleFollowPress = async () => {
    if (!effectiveId) return;
    try {
      if (isFollowing) {
        await unfollowMuseum({ museumId: effectiveId as Id<"museums"> });
      } else {
        await followMuseum({ museumId: effectiveId as Id<"museums"> });
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  const posthog = usePostHog();

  const handleCheckInPress = () => {
    if (!effectiveId) return;
    
    posthog?.capture('checkin_button_clicked', {
      museumId: effectiveId,
      hasVisitedBefore,
    });
    
    // Always navigate to check-in screen to create a new check-in
    router.push({
      pathname: '/(museums)/[museumId]/checkin',
      params: { museumId: effectiveId },
    });
  };

  const handleVisualSearchPress = () => {
    if (!effectiveId || !museum || !visualSearchAssignment) return;

    router.push({
      pathname: '/visual-search',
      params: {
        museumId: effectiveId,
        museumName: museum.name,
        museumSlug: visualSearchAssignment.museumSlug,
      },
    } as unknown as Href);
  };

  const handleUserCheckInPress = (checkIn: UserCheckIn) => {
    setEditingCheckIn(checkIn);
  };

  // Loading state
  if (museum === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center gap-3">
          <BrandActivityIndicator size="large" />
          <Text variant="muted" className="text-base">
            Loading museum...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (museum === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="mb-4 text-lg text-foreground">Museum not found</Text>
          <Pressable
            className="rounded-xl bg-primary px-6 py-3 active:opacity-90"
            onPress={() => router.back()}>
            <Text className="text-base font-semibold text-primary-foreground">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const addressParts = [
    museum.location?.address,
    museum.location?.city,
    museum.location?.state,
    museum.location?.country,
    museum.location?.postalCode,
  ].filter((value): value is string => Boolean(value?.trim()));
  const address = addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
  const hasAddress = addressParts.length > 0;
  const hasExpandedDetails = Boolean(
    museum.website ||
    museum.phone ||
    (museum.operatingHours && museum.operatingHours.length > 0) ||
    (museum.accessibilityFeatures && museum.accessibilityFeatures.length > 0) ||
    museum.accessibilityNotes
  );
  const mapDestination = [museum.name, ...addressParts].join(', ');
  const encodedDestination = encodeURIComponent(mapDestination);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedDestination}`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`;
  const googleReviewItems = (googleReviews ?? []) as GoogleMapsReview[];
  const hasGoogleMapsReviews = googleReviewItems.length > 0;

  const openMapUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Unable to open maps', 'This maps app is not available on your device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open maps', 'Please try again.');
    }
  };

  const handleAddressPress = () => {
    if (!hasAddress) return;

    const options = [
      { text: 'Open in Google Maps', onPress: () => void openMapUrl(googleMapsUrl) },
      { text: 'Open in Apple Maps', onPress: () => void openMapUrl(appleMapsUrl) },
      {
        text: 'Copy Address',
        onPress: async () => {
          await Clipboard.setStringAsync(address);
          Alert.alert('Address copied');
        },
      },
      { text: 'Cancel', style: 'cancel' as const },
    ];

    Alert.alert('Address actions', address, options);
  };

  return (
    <AuthGuard>
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScreenTitleBar title="Museum Details" onBackPress={() => router.back()} />

        <View className="flex-row border-b border-border bg-muted/40 px-2">
          <Pressable
            className={cn(
              'flex-1 items-center border-b-2 py-3',
              activeTab === 'about' ? 'border-primary' : 'border-transparent'
            )}
            onPress={() => setActiveTab('about')}>
            <Text
              className={cn(
                'text-sm font-medium',
                activeTab === 'about' ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}>
              About
            </Text>
          </Pressable>
          <Pressable
            className={cn(
              'flex-1 items-center border-b-2 py-3',
              activeTab === 'reviews' ? 'border-primary' : 'border-transparent'
            )}
            onPress={() => setActiveTab('reviews')}>
            <Text
              className={cn(
                'text-sm font-medium',
                activeTab === 'reviews' ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}>
              Reviews
            </Text>
          </Pressable>
        </View>

        {activeTab === 'reviews' ? (
          <FlatList
            ref={reviewsListRef}
            data={reviews ?? []}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
            ListHeaderComponent={
              hasGoogleMapsReviews && (reviews?.length ?? 0) > 0 ? (
                <Text className="mb-3 text-base font-semibold text-foreground">Community reviews</Text>
              ) : null
            }
            ListFooterComponent={
              googleReviews === undefined ? (
                <View className="mt-2 items-center rounded-2xl border border-border bg-card p-4">
                  <BrandActivityIndicator size="small" />
                  <Text className="mt-2 text-sm text-muted-foreground">Loading Google Maps reviews...</Text>
                </View>
              ) : hasGoogleMapsReviews ? (
                <View className={(reviews?.length ?? 0) > 0 ? 'mt-2' : ''}>
                  <GoogleMapsReviewsSection
                    reviews={googleReviewItems}
                    googleRating={museum.googleRating}
                    googleUserRatingCount={museum.googleUserRatingCount}
                    googleMapsUri={museum.googleMapsUri}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              reviews === undefined ? (
                <View className="flex-1 items-center justify-center gap-3 py-12">
                  <BrandActivityIndicator size="large" />
                  <Text variant="muted" className="text-base">
                    Loading reviews...
                  </Text>
                </View>
              ) : hasGoogleMapsReviews ? null : (
                <View className="items-center p-8">
                  <Text className="text-center text-sm text-muted-foreground">
                    No reviews yet. Be the first to check in!
                  </Text>
                </View>
              )
            }
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => (
              <View
                className={cn(
                  'mb-3 rounded-xl border bg-card p-4',
                  highlightId === item._id ? 'border-2 border-primary' : 'border-border'
                )}>
                <View className="mb-2 flex-row items-center">
                  <Pressable
                    className="mr-2 flex-1 flex-row items-center"
                    onPress={() => {
                      if (!item.userId) return;
                      router.push(userProfileHref(item.userId));
                    }}>
                    <Avatar className="mr-3 size-10" alt={item.userName}>
                      {item.userImage ? (
                        <AvatarImage source={{ uri: item.userImage }} />
                      ) : (
                        <AvatarFallback className="items-center justify-center bg-primary">
                          <Text className="text-base font-semibold text-primary-foreground">
                            {item.userName.charAt(0).toUpperCase()}
                          </Text>
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {item.userName}
                      </Text>
                      <Text variant="muted" className="mt-0.5 text-xs">
                        {new Date(item.createdAt).toLocaleDateString()}
                        {item.editedAt != null ? ' · Edited' : ''}
                      </Text>
                    </View>
                  </Pressable>
                  {item.rating != null && (
                    <View className="flex-row items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          size={14}
                          color={star <= item.rating! ? RN_API_PRIMARY_LIGHT : RN_API_BORDER_LIGHT}
                          fill={star <= item.rating! ? RN_API_PRIMARY_LIGHT : 'none'}
                        />
                      ))}
                      <Text className="ml-1 text-sm font-semibold text-primary">{item.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                {item.review ? <Text className="text-sm leading-5 text-foreground">{item.review}</Text> : null}
              </View>
            )}
          />
        ) : (
          <ScrollView
            className="flex-1"
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 32 + insets.bottom }}
            showsVerticalScrollIndicator={false}>
            {officialPhotoItems.length > 0 ? (
              <OfficialPhotoCarousel
                museumName={museum.name}
                photos={officialPhotoItems}
                width={carouselWidth}
                onPreview={setPreviewImageUrl}
                onImageError={handleOfficialPhotoError}
              />
            ) : null}

            <View className="mb-5 rounded-2xl border border-border bg-card p-5">
              <Text className="mb-4 text-[15px] leading-[22px] text-muted-foreground">
                {museum.description || 'No description available.'}
              </Text>

              <Pressable
                className={cn('flex-row items-center gap-2 rounded-md', hasAddress ? 'active:opacity-80' : '')}
                disabled={!hasAddress}
                onPress={handleAddressPress}>
                <MapPinIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                <Text className="flex-1 text-sm text-muted-foreground">{address}</Text>
                <CategoryTag category={museum.category} />
              </Pressable>

              {showMoreDetails && (
                <View className="mt-3.5 gap-2.5 border-t border-border pt-3.5">
                  {museum.website && (
                    <View className="gap-1">
                      <Text className="text-[13px] font-semibold text-foreground">Website</Text>
                      <Pressable onPress={() => void Linking.openURL(normalizeExternalUrl(museum.website!))}>
                        <Text className="text-sm text-primary underline underline-offset-2">{museum.website}</Text>
                      </Pressable>
                    </View>
                  )}

                  {museum.phone && (
                    <View className="gap-1">
                      <Text className="text-[13px] font-semibold text-foreground">Phone</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">{museum.phone}</Text>
                    </View>
                  )}

                  {museum.operatingHours && museum.operatingHours.length > 0 && (
                    <View className="gap-1">
                      <Text className="text-[13px] font-semibold text-foreground">Operating Hours</Text>
                      {museum.operatingHours.map((entry) => (
                        <Text key={entry.day} className="text-sm leading-5 text-muted-foreground">
                          {entry.day}: {entry.isOpen ? `${entry.openTime} - ${entry.closeTime}` : 'Closed'}
                        </Text>
                      ))}
                    </View>
                  )}

                  {museum.accessibilityFeatures && museum.accessibilityFeatures.length > 0 && (
                    <View className="gap-1">
                      <Text className="text-[13px] font-semibold text-foreground">Accessibility Features</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {museum.accessibilityFeatures.join(', ')}
                      </Text>
                    </View>
                  )}

                  {museum.accessibilityNotes && (
                    <View className="gap-1">
                      <Text className="text-[13px] font-semibold text-foreground">Accessibility Notes</Text>
                      <Text className="text-sm leading-5 text-muted-foreground">{museum.accessibilityNotes}</Text>
                    </View>
                  )}
                </View>
              )}

              {hasExpandedDetails && (
                <Pressable
                  className="mt-3 self-start rounded-full bg-muted px-3 py-1.5 active:opacity-75"
                  onPress={() => setShowMoreDetails((value) => !value)}>
                  <Text className="text-[13px] font-semibold text-foreground">
                    {showMoreDetails ? 'Show less' : 'View more'}
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              className={cn(
                'mb-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90',
                isFollowing ? 'bg-green-600' : 'border border-border bg-card'
              )}
              onPress={handleFollowPress}>
              <HeartIcon
                size={20}
                color={isFollowing ? followIconColor : notFollowIconColor}
                fill={isFollowing ? followIconColor : 'transparent'}
              />
              <Text className={cn('text-base font-semibold', isFollowing ? 'text-green-50' : 'text-foreground')}>
                {isFollowing ? 'Following' : 'Follow Museum'}
              </Text>
            </Pressable>

            <Pressable
              className={cn(
                'mb-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90',
                isBookmarked ? 'bg-amber-600' : 'border border-border bg-card'
              )}
              onPress={toggleBookmark}>
              <BookmarkIcon
                size={20}
                color={isBookmarked ? bookmarkIconColor : bookmarkUnselectedIconColor}
                fill={isBookmarked ? bookmarkIconColor : 'none'}
              />
              <Text className={cn('text-base font-semibold', isBookmarked ? 'text-amber-50' : 'text-foreground')}>
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Text>
            </Pressable>

            <Pressable
              className="mb-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-90"
              onPress={handleCheckInPress}>
              <CheckCircle2Icon size={20} color={RN_API_BACKGROUND_LIGHT} />
              <Text className="text-base font-semibold text-primary-foreground">
                {hasVisitedBefore ? 'Check In Again' : 'Check In'}
              </Text>
            </Pressable>

            {visualSearchAssignment ? (
              <Pressable
                className="mb-6 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 active:opacity-90"
                onPress={handleVisualSearchPress}>
                <ScanSearchIcon size={20} color={RN_API_FOREGROUND_LIGHT} />
                <Text className="text-base font-semibold text-foreground">Visual Search</Text>
              </Pressable>
            ) : null}

            <View className="mb-4">
              <Text className="mb-4 text-xl font-semibold text-foreground">Ongoing Events</Text>

              {events === undefined || exhibitions === undefined ? (
                <View className="items-center rounded-xl bg-muted p-8">
                  <BrandActivityIndicator size="small" />
                  <Text className="mt-2 text-sm text-muted-foreground">Loading events...</Text>
                </View>
              ) : ongoingItems.length > 0 ? (
                ongoingItems.map((item, index) => (
                  <EventCard
                    key={`ongoing-${item._id}`}
                    event={item}
                    showMuseum={false}
                    compactDate={false}
                    cardIndex={index}
                  />
                ))
              ) : (
                <View className="items-center rounded-xl bg-muted p-8">
                  <Text className="text-sm text-muted-foreground">No ongoing events or exhibitions</Text>
                </View>
              )}
            </View>

            <View className="mb-4">
              <Text className="mb-4 text-xl font-semibold text-foreground">Upcoming Events</Text>
              {events === undefined || exhibitions === undefined ? (
                <View className="items-center rounded-xl bg-muted p-8">
                  <BrandActivityIndicator size="small" />
                  <Text className="mt-2 text-sm text-muted-foreground">Loading events...</Text>
                </View>
              ) : upcomingItems.length > 0 ? (
                upcomingItems.map((item, index) => (
                  <EventCard
                    key={`upcoming-${item._id}`}
                    event={item}
                    showMuseum={false}
                    compactDate={false}
                    cardIndex={index}
                  />
                ))
              ) : (
                <View className="items-center rounded-xl bg-muted p-8">
                  <Text className="text-sm text-muted-foreground">No upcoming events or exhibitions</Text>
                </View>
              )}
            </View>

            <View className="mt-5">
              <Text className="mb-3 text-lg font-semibold text-foreground">Visitor Photos</Text>
              {museumCheckInPhotoUrls.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {museumCheckInPhotoUrls.map((url, index) => (
                    <Pressable
                      key={`${url}-${index}`}
                      className="overflow-hidden rounded-[10px]"
                      onPress={() => setPreviewImageUrl(url)}>
                      <Image
                        source={{ uri: url }}
                        className="size-[104px] rounded-[10px] bg-muted"
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="items-center rounded-xl bg-muted py-4">
                  <Text className="text-sm text-muted-foreground">No check-in photos yet</Text>
                </View>
              )}
            </View>

            <UserCheckInList checkIns={sortedUserCheckIns} onCheckInPress={handleUserCheckInPress} />
          </ScrollView>
        )}

      <Modal
        visible={previewImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/90 p-4"
          onPress={() => setPreviewImageUrl(null)}>
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              className="h-[80%] w-full"
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>

      <EditCheckinModal
        visible={editingCheckIn != null}
        checkInId={editingCheckIn?._id as Id<'checkIns'> | null}
        museumId={effectiveId as Id<'museums'> | undefined}
        initialRating={editingCheckIn?.rating ?? null}
        initialReview={editingCheckIn?.review}
        initialImageUrls={editingCheckIn?.imageUrls}
        initialImageIds={editingCheckIn?.imageIds}
        initialFriendUserIds={editingCheckIn?.friendUserIds}
        initialDurationHours={editingCheckIn?.durationHours}
        initialVisitDate={editingCheckIn?.visitDate}
        initialAttendedEventIds={editingCheckIn?.attendedEventIds}
        onSave={saveCheckIn}
        onDelete={() =>
          editingCheckIn && deleteCheckIn(editingCheckIn._id as Id<'checkIns'>)
        }
        onClose={() => setEditingCheckIn(null)}
      />
      </SafeAreaView>
    </AuthGuard>
  );
}
