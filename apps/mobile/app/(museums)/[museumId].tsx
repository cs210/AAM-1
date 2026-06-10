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
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
import { useSoftwareFairMode } from '@/lib/software-fair-mode';
import { SoftwareFairBoothMapSvg } from '@/components/software-fair-booth-map-svg';
import { SOFTWARE_FAIR_MAP_VIEWBOX } from '@/lib/software-fair-map-layout';
import {
  getSoftwareFairCardPalette,
  SOFTWARE_FAIR_GRADIENT_END,
  SOFTWARE_FAIR_GRADIENT_START,
} from '@/lib/software-fair-card-style';
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

export default function MuseumDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useUniwind();
  const bookmarkIconColor = theme === 'dark' ? RN_API_BACKGROUND_DARK : RN_API_BACKGROUND_LIGHT;
  const bookmarkUnselectedIconColor =
    theme === 'dark' ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const followIconColor = theme === 'dark' ? RN_API_BACKGROUND_DARK : RN_API_BACKGROUND_LIGHT;
  const notFollowIconColor = theme === 'dark' ? RN_API_FOREGROUND_DARK : RN_API_FOREGROUND_LIGHT;
  const params = useLocalSearchParams<{ museumId: string; tab?: string; highlight?: string }>();
  const museumIdParam = params.museumId;
  const id =
    typeof museumIdParam === 'string'
      ? museumIdParam
      : Array.isArray(museumIdParam)
        ? museumIdParam[0]
        : undefined;
  const tabParam =
    typeof params.tab === 'string'
      ? params.tab
      : Array.isArray(params.tab)
        ? params.tab[0]
        : undefined;
  const highlightId =
    typeof params.highlight === 'string'
      ? params.highlight
      : Array.isArray(params.highlight)
        ? params.highlight[0]
        : undefined;
  const softwareFair = useSoftwareFairMode();

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
  const museum = useQuery(
    api.museums.getMuseum,
    effectiveId ? { id: effectiveId as Id<'museums'> } : 'skip'
  );
  const softwareFairBooth = useQuery(
    api.softwareFair.getBoothByMuseum,
    softwareFair.isJoined && effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );
  const shouldLoadMuseumTimedContent = Boolean(
    effectiveId && (!softwareFair.isJoined || softwareFairBooth === null)
  );

  // Fetch events for this museum
  const events = useQuery(
    api.events.getEventsByMuseum,
    shouldLoadMuseumTimedContent ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );

  // Reviews for this museum (with user info)
  const reviews = useQuery(
    api.checkIns.getMuseumCheckInsWithUsers,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
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
    shouldLoadMuseumTimedContent ? { museumId: effectiveId as Id<'museums'> } : 'skip'
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
      activeVisualSearchMuseums.find((assignment) => String(assignment.museumId) === effectiveId) ??
      null
    );
  }, [activeVisualSearchMuseums, effectiveId]);

  // Check if user follows this museum
  const isFollowing = useQuery(
    api.follows.isFollowing,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );

  // Check if user has bookmarked this museum
  const { isBookmarked, toggleBookmark } = useBookmark(
    effectiveId ? (effectiveId as Id<'museums'>) : ('' as Id<'museums'>)
  );

  // Current user and their check-ins at this museum
  const currentUser = useQuery(api.auth.getCurrentUser);
  const userCheckIns = useQuery(
    api.checkIns.getUserMuseumCheckIns,
    effectiveId && currentUser
      ? { userId: currentUser._id, museumId: effectiveId as Id<'museums'> }
      : 'skip'
  );

  // Sort check-ins by visit date (most recent first)
  const sortedUserCheckIns = useMemo(() => {
    if (!userCheckIns || userCheckIns.length === 0) return [];
    return [...userCheckIns].sort(
      (a, b) => (b.visitDate ?? b.createdAt) - (a.visitDate ?? a.createdAt)
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
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isBoothMapExpanded, setIsBoothMapExpanded] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckIn(null));

  useEffect(() => {
    setShowMoreDetails(false);
    setIsBoothMapExpanded(false);
  }, [effectiveId]);

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
        await unfollowMuseum({ museumId: effectiveId as Id<'museums'> });
      } else {
        await followMuseum({ museumId: effectiveId as Id<'museums'> });
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
      <SafeAreaView
        className="bg-background flex-1"
        style={{ flex: 1 }}
        edges={['top', 'left', 'right']}>
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
      <SafeAreaView
        className="bg-background flex-1"
        style={{ flex: 1 }}
        edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-foreground mb-4 text-lg">Museum not found</Text>
          <Pressable
            className="bg-primary rounded-xl px-6 py-3 active:opacity-90"
            onPress={() => router.back()}>
            <Text className="text-primary-foreground text-base font-semibold">Go Back</Text>
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
  const boothPalette = softwareFairBooth
    ? getSoftwareFairCardPalette(softwareFairBooth.boothNumber)
    : null;
  const placeNoun = softwareFairBooth ? 'Booth' : 'Museum';
  const boothLocationLabel = hasAddress ? address : 'CoDa B80';
  const showMuseumEventSections = !softwareFair.isJoined || softwareFairBooth === null;
  const boothPreviewMapWidth = Math.max(220, Math.min(360, viewportWidth - 80));
  const boothPreviewMapHeight =
    boothPreviewMapWidth * (SOFTWARE_FAIR_MAP_VIEWBOX.height / SOFTWARE_FAIR_MAP_VIEWBOX.width);

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
      <SafeAreaView
        className="bg-background flex-1"
        style={{ flex: 1 }}
        edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScreenTitleBar
          title={softwareFairBooth ? 'Booth Details' : 'Museum Details'}
          onBackPress={() => router.back()}
        />

        <View className="border-border bg-muted/40 flex-row border-b px-2">
          <Pressable
            className={cn(
              'flex-1 items-center border-b-2 py-3',
              activeTab === 'about' ? 'border-primary' : 'border-transparent'
            )}
            onPress={() => setActiveTab('about')}>
            <Text
              className={cn(
                'text-sm font-medium',
                activeTab === 'about' ? 'text-primary font-semibold' : 'text-muted-foreground'
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
                activeTab === 'reviews' ? 'text-primary font-semibold' : 'text-muted-foreground'
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
            ListEmptyComponent={
              reviews === undefined ? (
                <View className="flex-1 items-center justify-center gap-3 py-12">
                  <BrandActivityIndicator size="large" />
                  <Text variant="muted" className="text-base">
                    Loading reviews...
                  </Text>
                </View>
              ) : (
                <View className="items-center p-8">
                  <Text className="text-muted-foreground text-center text-sm">
                    No reviews yet. Be the first to check in!
                  </Text>
                </View>
              )
            }
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => (
              <View
                className={cn(
                  'bg-card mb-3 rounded-xl border p-4',
                  highlightId === item._id ? 'border-primary border-2' : 'border-border'
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
                        <AvatarFallback className="bg-primary items-center justify-center">
                          <Text className="text-primary-foreground text-base font-semibold">
                            {item.userName.charAt(0).toUpperCase()}
                          </Text>
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <View className="flex-1">
                      <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
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
                      <Text className="text-primary ml-1 text-sm font-semibold">
                        {item.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {item.review ? (
                  <Text className="text-foreground text-sm leading-5">{item.review}</Text>
                ) : null}
              </View>
            )}
          />
        ) : (
          <ScrollView
            className="flex-1"
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 32 + insets.bottom }}
            showsVerticalScrollIndicator={false}>
            {museum.imageUrl && (
              <View className="bg-muted mb-2.5 h-[150px] justify-end overflow-hidden rounded-[18px]">
                <Image
                  source={{ uri: museum.imageUrl }}
                  className="absolute inset-0 size-full"
                  resizeMode="cover"
                />
                <View className="absolute inset-0 bg-black/35" />
                <Text className="px-4 pb-3.5 text-2xl font-bold text-white" numberOfLines={2}>
                  {softwareFairBooth?.projectName ?? museum.name}
                </Text>
              </View>
            )}

            {softwareFairBooth ? (
              <View className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 shadow-sm shadow-black/10">
                {boothPalette ? (
                  <>
                    <LinearGradient
                      colors={boothPalette.gradient}
                      start={SOFTWARE_FAIR_GRADIENT_START}
                      end={SOFTWARE_FAIR_GRADIENT_END}
                      style={StyleSheet.absoluteFill}
                    />
                    <View pointerEvents="none" className="absolute inset-0 bg-black/10" />
                    <View
                      pointerEvents="none"
                      className="absolute top-0 left-0 h-full w-1"
                      style={{ backgroundColor: boothPalette.accent }}
                    />
                  </>
                ) : null}
                <View className="p-5">
                  <View className="mb-4 flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <View className="self-start rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
                        <Text className="text-[11px] font-semibold tracking-wide text-white/85 uppercase">
                          Booth {softwareFairBooth.boothNumber}
                        </Text>
                      </View>
                      <Text className="mt-3 text-2xl leading-7 font-semibold text-white">
                        {softwareFairBooth.projectName}
                      </Text>
                    </View>
                    {softwareFairBooth.guideUrl ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open Software Fair guide"
                        hitSlop={8}
                        onPress={() =>
                          void Linking.openURL(normalizeExternalUrl(softwareFairBooth.guideUrl!))
                        }
                        className="rounded-full border border-white/15 bg-white/10 p-2 active:opacity-75">
                        <ExternalLinkIcon
                          size={18}
                          color={boothPalette?.accent ?? RN_API_BACKGROUND_LIGHT}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                  {softwareFairBooth.description ? (
                    <Text className="mb-4 text-sm leading-5 text-white/82">
                      {softwareFairBooth.description}
                    </Text>
                  ) : null}
                  {softwareFairBooth.genres.length > 0 ? (
                    <View className="mb-4 flex-row flex-wrap gap-2">
                      {softwareFairBooth.genres.map((genre) => (
                        <View
                          key={genre}
                          className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
                          <Text className="text-xs font-semibold text-white/85">{genre}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {softwareFairBooth.teamMembers.length > 0 ? (
                    <View className="border-t border-white/10 pt-3">
                      <Text className="mb-1 text-[13px] font-semibold text-white">Team</Text>
                      <Text className="text-sm leading-5 text-white/72">
                        {softwareFairBooth.teamMembers.join(', ')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {softwareFairBooth ? (
              <View className="border-border bg-card mb-5 rounded-2xl border p-5">
                <View className="mb-3 flex-row items-center justify-between gap-3">
                  <Text className="text-foreground text-base font-semibold">Location</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isBoothMapExpanded ? 'Hide booth map' : 'Show booth map'}
                    onPress={() => setIsBoothMapExpanded((value) => !value)}
                    className="bg-muted flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-75">
                    <Text className="text-foreground text-xs font-semibold">
                      {isBoothMapExpanded ? 'Hide map' : 'Show map'}
                    </Text>
                    {isBoothMapExpanded ? (
                      <ChevronUpIcon size={14} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                    ) : (
                      <ChevronDownIcon size={14} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                    )}
                  </Pressable>
                </View>
                <Pressable
                  className={cn(
                    'flex-row items-center gap-2 rounded-md',
                    hasAddress ? 'active:opacity-80' : ''
                  )}
                  disabled={!hasAddress}
                  onPress={handleAddressPress}>
                  <MapPinIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                  <Text className="text-muted-foreground flex-1 text-sm leading-5">
                    {boothLocationLabel}
                  </Text>
                </Pressable>
                {isBoothMapExpanded ? (
                  <View className="border-border bg-card mt-4 self-center overflow-hidden rounded-xl border">
                    <SoftwareFairBoothMapSvg
                      booths={[
                        {
                          boothNumber: softwareFairBooth.boothNumber,
                          genres: softwareFairBooth.genres,
                        },
                      ]}
                      width={boothPreviewMapWidth}
                      height={boothPreviewMapHeight}
                      accessibilityLabel={`CoDa B80 map highlighting booth ${softwareFairBooth.boothNumber}`}
                      highlightedBoothNumber={softwareFairBooth.boothNumber}
                      showAllBoothNumbers
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="border-border bg-card mb-5 rounded-2xl border p-5">
                <Text className="text-muted-foreground mb-4 text-[15px] leading-[22px]">
                  {museum.description || 'No description available.'}
                </Text>

                <Pressable
                  className={cn(
                    'flex-row items-center gap-2 rounded-md',
                    hasAddress ? 'active:opacity-80' : ''
                  )}
                  disabled={!hasAddress}
                  onPress={handleAddressPress}>
                  <MapPinIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
                  <Text className="text-muted-foreground flex-1 text-sm">{address}</Text>
                  <CategoryTag category={museum.category} />
                </Pressable>

                {showMoreDetails && (
                  <View className="border-border mt-3.5 gap-2.5 border-t pt-3.5">
                    {museum.website && (
                      <View className="gap-1">
                        <Text className="text-foreground text-[13px] font-semibold">Website</Text>
                        <Pressable
                          onPress={() =>
                            void Linking.openURL(normalizeExternalUrl(museum.website!))
                          }>
                          <Text className="text-primary text-sm underline underline-offset-2">
                            {museum.website}
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {museum.phone && (
                      <View className="gap-1">
                        <Text className="text-foreground text-[13px] font-semibold">Phone</Text>
                        <Text className="text-muted-foreground text-sm leading-5">
                          {museum.phone}
                        </Text>
                      </View>
                    )}

                    {museum.operatingHours && museum.operatingHours.length > 0 && (
                      <View className="gap-1">
                        <Text className="text-foreground text-[13px] font-semibold">
                          Operating Hours
                        </Text>
                        {museum.operatingHours.map((entry) => (
                          <Text key={entry.day} className="text-muted-foreground text-sm leading-5">
                            {entry.day}:{' '}
                            {entry.isOpen ? `${entry.openTime} - ${entry.closeTime}` : 'Closed'}
                          </Text>
                        ))}
                      </View>
                    )}

                    {museum.accessibilityFeatures && museum.accessibilityFeatures.length > 0 && (
                      <View className="gap-1">
                        <Text className="text-foreground text-[13px] font-semibold">
                          Accessibility Features
                        </Text>
                        <Text className="text-muted-foreground text-sm leading-5">
                          {museum.accessibilityFeatures.join(', ')}
                        </Text>
                      </View>
                    )}

                    {museum.accessibilityNotes && (
                      <View className="gap-1">
                        <Text className="text-foreground text-[13px] font-semibold">
                          Accessibility Notes
                        </Text>
                        <Text className="text-muted-foreground text-sm leading-5">
                          {museum.accessibilityNotes}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {hasExpandedDetails && (
                  <Pressable
                    className="bg-muted mt-3 self-start rounded-full px-3 py-1.5 active:opacity-75"
                    onPress={() => setShowMoreDetails((value) => !value)}>
                    <Text className="text-foreground text-[13px] font-semibold">
                      {showMoreDetails ? 'Show less' : 'View more'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable
              className={cn(
                'mb-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90',
                isFollowing ? 'bg-green-600' : 'border-border bg-card border'
              )}
              onPress={handleFollowPress}>
              <HeartIcon
                size={20}
                color={isFollowing ? followIconColor : notFollowIconColor}
                fill={isFollowing ? followIconColor : 'transparent'}
              />
              <Text
                className={cn(
                  'text-base font-semibold',
                  isFollowing ? 'text-green-50' : 'text-foreground'
                )}>
                {isFollowing ? 'Following' : `Follow ${placeNoun}`}
              </Text>
            </Pressable>

            <Pressable
              className={cn(
                'mb-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90',
                isBookmarked ? 'bg-amber-600' : 'border-border bg-card border'
              )}
              onPress={toggleBookmark}>
              <BookmarkIcon
                size={20}
                color={isBookmarked ? bookmarkIconColor : bookmarkUnselectedIconColor}
                fill={isBookmarked ? bookmarkIconColor : 'none'}
              />
              <Text
                className={cn(
                  'text-base font-semibold',
                  isBookmarked ? 'text-amber-50' : 'text-foreground'
                )}>
                {isBookmarked ? 'Bookmarked' : `Bookmark ${placeNoun}`}
              </Text>
            </Pressable>

            <Pressable
              className="bg-primary mb-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90"
              onPress={handleCheckInPress}>
              <CheckCircle2Icon size={20} color={RN_API_BACKGROUND_LIGHT} />
              <Text className="text-primary-foreground text-base font-semibold">
                {hasVisitedBefore
                  ? 'Check In Again'
                  : softwareFairBooth
                    ? 'Check In at Booth'
                    : 'Check In'}
              </Text>
            </Pressable>

            {visualSearchAssignment ? (
              <Pressable
                className="border-border bg-card mb-6 flex-row items-center justify-center gap-2 rounded-xl border py-3.5 active:opacity-90"
                onPress={handleVisualSearchPress}>
                <ScanSearchIcon size={20} color={RN_API_FOREGROUND_LIGHT} />
                <Text className="text-foreground text-base font-semibold">Visual Search</Text>
              </Pressable>
            ) : null}

            {showMuseumEventSections ? (
              <>
                <View className="mb-4">
                  <Text className="text-foreground mb-4 text-xl font-semibold">Ongoing Events</Text>

                  {events === undefined || exhibitions === undefined ? (
                    <View className="bg-muted items-center rounded-xl p-8">
                      <BrandActivityIndicator size="small" />
                      <Text className="text-muted-foreground mt-2 text-sm">Loading events...</Text>
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
                    <View className="bg-muted items-center rounded-xl p-8">
                      <Text className="text-muted-foreground text-sm">
                        No ongoing events or exhibitions
                      </Text>
                    </View>
                  )}
                </View>

                <View className="mb-4">
                  <Text className="text-foreground mb-4 text-xl font-semibold">
                    Upcoming Events
                  </Text>
                  {events === undefined || exhibitions === undefined ? (
                    <View className="bg-muted items-center rounded-xl p-8">
                      <BrandActivityIndicator size="small" />
                      <Text className="text-muted-foreground mt-2 text-sm">Loading events...</Text>
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
                    <View className="bg-muted items-center rounded-xl p-8">
                      <Text className="text-muted-foreground text-sm">
                        No upcoming events or exhibitions
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}

            <View className="mt-5">
              <Text className="text-foreground mb-3 text-lg font-semibold">Visitor Photos</Text>
              {museumCheckInPhotoUrls.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {museumCheckInPhotoUrls.map((url, index) => (
                    <Pressable
                      key={`${url}-${index}`}
                      className="overflow-hidden rounded-[10px]"
                      onPress={() => setPreviewImageUrl(url)}>
                      <Image
                        source={{ uri: url }}
                        className="bg-muted size-[104px] rounded-[10px]"
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="bg-muted items-center rounded-xl py-4">
                  <Text className="text-muted-foreground text-sm">No check-in photos yet</Text>
                </View>
              )}
            </View>

            <UserCheckInList
              checkIns={sortedUserCheckIns}
              onCheckInPress={handleUserCheckInPress}
            />
          </ScrollView>
        )}

        <Modal
          visible={previewImageUrl != null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUrl(null)}>
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
          onDelete={() => editingCheckIn && deleteCheckIn(editingCheckIn._id as Id<'checkIns'>)}
          onClose={() => setEditingCheckIn(null)}
        />
      </SafeAreaView>
    </AuthGuard>
  );
}
