import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Linking,
  Share,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { MapPin, List, XIcon } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, type MuseumCardData } from '../../components/museum-card';
import { MuseumMapView } from '../../components/museum-map-view';
import { CheckinPost, type CheckinPostData } from '../../components/checkin-post';
import { SearchFieldRow } from '../../components/search-field-row';
import { PaginationPill } from '../../components/pagination-pill';
import { DecorativeGradientShapes } from '@/components/decorative-gradient-shapes';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getLastExploreTabIndex, setLastExploreTabIndex } from '@/lib/last-people-search';
import { userProfileHref } from '@/lib/user-profile-navigation';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import appsFlyer from 'react-native-appsflyer';

const appsFlyerKey = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY as string;

if (!appsFlyerKey) {
  throw new Error('Missing EXPO_PUBLIC_APPSFLYER_DEV_KEY');
}

appsFlyer.initSdk(
  {
    devKey: appsFlyerKey,
    isDebug: true,
    appId: '6760368719',
  },
  (result) => {
    console.log(result);
  },
  (error) => {
    console.error(error);
  }
);

// set the template ID before you generate a link. Without it UserInvite won't work.
appsFlyer.setAppInviteOneLinkID('Rz7b');

const MUSEUMS_PER_PAGE = 10;
const LIST_PADDING_BOTTOM = { paddingBottom: 80 } as const;
const FEED_LIST_PADDING = { paddingBottom: 80, paddingHorizontal: 20 } as const;
const MUTED_ICON_COLOR = '#73706c';

type MuseumAdditionRequestDraft = {
  museumName: string;
  city: string;
  state: string;
  website: string;
  note: string;
};

function normalizeMuseumRequestName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function MuseumRequestModal({
  visible,
  initialMuseumName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initialMuseumName: string;
  onClose: () => void;
  onSubmit: (request: MuseumAdditionRequestDraft) => void;
}) {
  const [museumName, setMuseumName] = useState(initialMuseumName);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [website, setWebsite] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMuseumName(initialMuseumName);
    setCity('');
    setState('');
    setWebsite('');
    setNote('');
  }, [initialMuseumName, visible]);

  const canSubmit = museumName.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      museumName: museumName.trim(),
      city: city.trim(),
      state: state.trim(),
      website: website.trim(),
      note: note.trim(),
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityLabel="Dismiss museum request form"
        />
        <View className="z-10 max-h-[90%] rounded-t-3xl bg-background shadow-lg">
          <View className="border-border border-b px-5 pb-4 pt-3">
            <View className="bg-muted mx-auto mb-3 h-1 w-10 rounded-full" />
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-xl font-bold">Request a museum</Text>
                <Text className="text-muted-foreground mt-1 text-sm leading-5">
                  Share what you know and our team can review it.
                </Text>
              </View>
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Close museum request form"
                onPress={onClose}
                className="shrink-0">
                <XIcon size={21} color={MUTED_ICON_COLOR} />
              </Button>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">Museum name</Text>
                <Input
                  value={museumName}
                  onChangeText={setMuseumName}
                  placeholder="Museum name"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Text className="text-foreground text-sm font-semibold">City</Text>
                  <Input
                    value={city}
                    onChangeText={setCity}
                    placeholder="Optional"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                <View className="w-24 gap-2">
                  <Text className="text-foreground text-sm font-semibold">State</Text>
                  <Input
                    value={state}
                    onChangeText={setState}
                    placeholder="CA"
                    autoCapitalize="characters"
                    maxLength={24}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">Website</Text>
                <Input
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="Optional"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="next"
                />
              </View>

              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">Anything else?</Text>
                <Input
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional note for the team"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View className="mt-2 flex-row gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onPress={onClose}>
                  <Text className="text-base font-semibold">Cancel</Text>
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onPress={handleSubmit}
                  disabled={!canSubmit}>
                  <Text className="text-primary-foreground text-base font-semibold">Submit</Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MuseumsRoute({
  museumSearch,
  setMuseumSearch,
  museums,
  pagedMuseums,
  filteredMuseums,
  museumPage,
  totalMuseumPages,
  onPrevPage,
  onNextPage,
  sortedByDistance,
  expectDistanceOnCards,
  locationNote,
  onRetryLocation,
  viewMode,
  onToggleViewMode,
  onRequestMuseum,
  museumRequestSubmitted,
}: {
  museumSearch: string;
  setMuseumSearch: (v: string) => void;
  museums: ReturnType<typeof useQuery<typeof api.museums.listMuseumsWithStats>>;
  pagedMuseums: MuseumCardData[];
  filteredMuseums: MuseumCardData[];
  museumPage: number;
  totalMuseumPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  sortedByDistance: boolean;
  expectDistanceOnCards: boolean;
  locationNote: string | null;
  onRetryLocation: () => void;
  viewMode: 'list' | 'map';
  onToggleViewMode: () => void;
  onRequestMuseum: () => void;
  museumRequestSubmitted: boolean;
}) {
  const requestedMuseumName = museumSearch.trim();
  const canRequestMuseum = requestedMuseumName.length >= 2;

  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <View className="flex-row items-center gap-2 px-5 py-3">
        <View className="flex-1">
          <SearchFieldRow
            value={museumSearch}
            onChangeText={setMuseumSearch}
            placeholder="Search museums..."
          />
        </View>
        <Pressable
          onPress={onToggleViewMode}
          className="bg-primary rounded-lg p-2.5 active:opacity-80"
          accessibilityLabel={`Switch to ${viewMode === 'list' ? 'map' : 'list'} view`}
          accessibilityRole="button">
          {viewMode === 'list' ? (
            <MapPin size={20} color="white" />
          ) : (
            <List size={20} color="white" />
          )}
        </Pressable>
      </View>
      {sortedByDistance ? (
        <Text
          className="text-muted-foreground mx-5 mt-[-2px] mb-2 text-xs"
          accessibilityLiveRegion="polite">
          Nearest first - distances in miles from you
        </Text>
      ) : locationNote ? (
        <View className="border-border bg-muted/30 mx-5 mt-[-2px] mb-3 rounded-xl border p-3">
          <Text className="text-muted-foreground text-sm leading-5">{locationNote}</Text>
          <View className="mt-2.5 flex-row flex-wrap gap-2.5">
            <Pressable
              onPress={onRetryLocation}
              className="bg-primary rounded-lg px-3 py-1.5 active:opacity-90">
              <Text className="text-primary-foreground text-xs font-semibold">Try again</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openSettings()}
              className="border-border bg-card rounded-lg border px-3 py-1.5 active:opacity-90">
              <Text className="text-foreground text-xs font-semibold">Open Settings</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {viewMode === 'map' ? (
        <MuseumMapView museums={filteredMuseums} isLoading={museums === undefined} />
      ) : museums === undefined ? (
        <View className="flex-1 items-center justify-center" style={{ flex: 1 }}>
          <BrandActivityIndicator size="large" />
          <Text variant="muted" className="mt-3 text-base">
            Loading museums...
          </Text>
        </View>
      ) : (
        <FlatList
          data={pagedMuseums}
          renderItem={({ item }) => (
            <MuseumCard museum={item} expectDistance={expectDistanceOnCards} />
          )}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={LIST_PADDING_BOTTOM}
          scrollEnabled
          ListFooterComponent={
            filteredMuseums.length > 0 ? (
              <View className="mt-2.5 mb-6 flex-row items-center justify-center gap-2.5">
                <PaginationPill label="Previous" onPress={onPrevPage} disabled={museumPage <= 1} />
                <Text className="text-muted-foreground text-sm font-medium">
                  Page {museumPage} of {totalMuseumPages}
                </Text>
                <PaginationPill
                  label="Next"
                  onPress={onNextPage}
                  disabled={museumPage >= totalMuseumPages}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center px-8 py-12">
              <Text className="text-foreground text-center text-lg font-semibold">
                {museumRequestSubmitted ? 'Request sent' : 'No museums match your search'}
              </Text>
              <Text className="text-muted-foreground mt-2 text-center text-base leading-6">
                {canRequestMuseum
                  ? museumRequestSubmitted
                    ? `Thanks for telling us about "${requestedMuseumName}". Our team can review it for Museum&.`
                    : `Want us to add "${requestedMuseumName}"? Send the details to our team for review.`
                  : 'Search for a museum name, then request it if it is missing.'}
              </Text>
              {canRequestMuseum && !museumRequestSubmitted ? (
                <Button className="mt-5 rounded-xl px-6" onPress={onRequestMuseum}>
                  <Text className="text-primary-foreground text-base font-semibold">
                    Request this museum
                  </Text>
                </Button>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

type PeopleSearchResult = {
  userId: string;
  name?: string | null;
  username?: string | null;
  imageUrl?: string | null;
};

function PeopleSearchRoute({
  peopleSearch,
  setPeopleSearch,
  searchResults,
  searchLoading,
  currUser,
  currUserId,
  recommendedPeople,
}: {
  peopleSearch: string;
  setPeopleSearch: (v: string) => void;
  searchResults: PeopleSearchResult[];
  searchLoading: boolean;
  currUser: { _id: string } | null | undefined;
  currUserId: string | null;
  recommendedPeople:
    | {
        userId: string;
        name?: string | null;
        username?: string | null;
        email?: string | null;
        imageUrl?: string | null;
      }[]
    | undefined;
}) {
  const isSearching = peopleSearch.trim().length > 0;
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleShareInviteLink = async () => {
    setIsGeneratingLink(true);
    try {
      appsFlyer.generateInviteLink(
        {
          channel: 'in-app',
          campaign: 'people-search-invite',
          customerID: currUserId || 'unknown',
          userParams: {
            deep_link_value: 'explore',
            deep_link_sub1: 'people',
            brandDomain: 'https://yami-stanford.vercel.app',
          },
        },
        (link) => {
          Share.share({
            message: `Join me on Museum& and let's share our museum taste! 🎨\n\n${link}`,
            title: 'Share My Museum& Profile',
            url: link as string,
          }).catch((err) => console.error('Share error:', err));
          setIsGeneratingLink(false);
        },
        (err) => {
          console.error('Failed to generate invite link:', err);
          setIsGeneratingLink(false);
        }
      );
    } catch (error) {
      console.error('Error initiating share:', error);
      setIsGeneratingLink(false);
    }
  };

  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <View className="items-center py-3">
        <View className="w-full">
          <SearchFieldRow
            value={peopleSearch}
            onChangeText={setPeopleSearch}
            placeholder="Search by name or @username"
          />
        </View>
        <Button
          variant="secondary"
          className="mt-3 mb-3 w-fit px-6"
          onPress={handleShareInviteLink}
          disabled={isGeneratingLink}>
          <Text className="text-base font-semibold">
            {isGeneratingLink ? 'Sending invite...' : 'Invite your friends'}
          </Text>
        </Button>
      </View>
      {isSearching ? (
        searchLoading ? (
          <View className="flex-1 items-center justify-center" style={{ flex: 1 }}>
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="mt-3 text-base">
              Loading people...
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={({ item }) => {
              if (currUser && item.userId === currUser._id) return null;
              const rawName = item.name || '';
              const displayName =
                typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
              const initial = (
                displayName && displayName !== "Name can't be displayed" ? displayName[0] : '?'
              ).toUpperCase();
              return (
                <Pressable
                  className="border-border bg-card mx-5 mb-3 flex-row items-center gap-3 rounded-xl border p-4 active:opacity-90"
                  onPress={() => {
                    router.push(userProfileHref(item.userId));
                  }}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} className="size-12 rounded-full" />
                  ) : (
                    <View className="bg-primary size-12 items-center justify-center rounded-full">
                      <Text className="text-primary-foreground text-lg font-semibold">
                        {initial}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-foreground text-lg font-medium" numberOfLines={1}>
                      {displayName || "Name can't be displayed"}
                    </Text>
                    {item.username ? (
                      <Text className="text-muted-foreground text-sm" numberOfLines={1}>
                        @{item.username}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
            keyExtractor={(item) => item.userId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={LIST_PADDING_BOTTOM}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View className="items-center px-12 py-12">
                <Text className="text-muted-foreground text-center text-base">
                  No people match your search
                </Text>
              </View>
            }
          />
        )
      ) : recommendedPeople && recommendedPeople.length > 0 ? (
        <FlatList
          data={recommendedPeople}
          renderItem={({ item }) => {
            if (currUser && item.userId === currUser._id) return null;
            const rawName = item.name || '';
            const displayName =
              typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
            const initial = (
              displayName && displayName !== "Name can't be displayed" ? displayName[0] : '?'
            ).toUpperCase();
            return (
              <Pressable
                className="border-border bg-card mx-5 mb-3 flex-row items-center gap-3 rounded-xl border p-4 active:opacity-90"
                onPress={() => {
                  router.push(userProfileHref(item.userId));
                }}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} className="size-12 rounded-full" />
                ) : (
                  <View className="bg-primary size-12 items-center justify-center rounded-full">
                    <Text className="text-primary-foreground text-lg font-semibold">{initial}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-foreground text-lg font-medium" numberOfLines={1}>
                    {displayName || "Name can't be displayed"}
                  </Text>
                  {item.username ? (
                    <Text className="text-muted-foreground text-sm" numberOfLines={1}>
                      @{item.username}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          keyExtractor={(item) => item.userId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={LIST_PADDING_BOTTOM}
          ListHeaderComponent={
            <View className="px-5 py-3">
              <Text className="text-foreground text-lg font-semibold">People you may know</Text>
            </View>
          }
        />
      ) : (
        <View className="items-center px-12 py-12">
          <Text className="text-muted-foreground text-center text-base">
            Search for people to follow and see their profiles!
          </Text>
        </View>
      )}
    </View>
  );
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ search?: string | string[]; tab?: string | string[] }>();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const tabs = React.useMemo(
    () => [
      { key: 'people', title: 'People' },
      { key: 'museums', title: 'Museums' },
    ],
    []
  );

  const [peopleSearch, setPeopleSearch] = useState('');
  const [index, setIndexState] = useState(() => getLastExploreTabIndex());
  const setIndex = useCallback((next: number) => {
    setIndexState(next);
    setLastExploreTabIndex(next);
  }, []);

  useEffect(() => {
    const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (tabParam === 'museums') {
      setIndex(1);
    } else if (tabParam === 'people') {
      setIndex(0);
    }
  }, [params.search, params.tab, setIndex]);

  useFocusEffect(
    useCallback(() => {
      setIndexState(getLastExploreTabIndex());
    }, [])
  );

  const [museumSearch, setMuseumSearch] = useState('');
  const [museumRequestModalVisible, setMuseumRequestModalVisible] = useState(false);
  const [requestedMuseumNames, setRequestedMuseumNames] = useState<Set<string>>(() => new Set());
  const [museumPage, setMuseumPage] = useState(1);
  const { locState, retry } = useViewerLocation();

  const museums = useQuery(
    api.museums.listMuseumsWithStats,
    locState.status === 'ok' ? { viewer: locState.viewer } : {}
  );
  const filteredMuseums = useMemo(() => {
    if (!museums) return [];
    if (!museumSearch.trim()) return museums;
    const lowerSearch = museumSearch.toLowerCase();
    return museums.filter(
      (museum) =>
        museum.name.toLowerCase().includes(lowerSearch) ||
        museum.location?.city?.toLowerCase().includes(lowerSearch) ||
        museum.location?.state?.toLowerCase().includes(lowerSearch)
    );
  }, [museums, museumSearch]);
  const totalMuseumPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMuseums.length / MUSEUMS_PER_PAGE)),
    [filteredMuseums.length]
  );
  const currentMuseumPage = Math.min(museumPage, totalMuseumPages);
  const pagedMuseums = useMemo(() => {
    const startIndex = (currentMuseumPage - 1) * MUSEUMS_PER_PAGE;
    return filteredMuseums.slice(startIndex, startIndex + MUSEUMS_PER_PAGE);
  }, [filteredMuseums, currentMuseumPage]);
  useEffect(() => {
    setMuseumPage(1);
  }, [museumSearch]);
  useEffect(() => {
    if (museumPage > totalMuseumPages) {
      setMuseumPage(totalMuseumPages);
    }
  }, [museumPage, totalMuseumPages]);
  const currentMuseumRequestKey = useMemo(
    () => normalizeMuseumRequestName(museumSearch),
    [museumSearch]
  );
  const museumRequestSubmitted =
    currentMuseumRequestKey.length > 0 && requestedMuseumNames.has(currentMuseumRequestKey);
  const handleSubmitMuseumRequest = useCallback((request: MuseumAdditionRequestDraft) => {
    const requestKey = normalizeMuseumRequestName(request.museumName);
    if (!requestKey) return;
    setRequestedMuseumNames((previous) => {
      const next = new Set(previous);
      next.add(requestKey);
      return next;
    });
    setMuseumSearch(request.museumName);
    setMuseumRequestModalVisible(false);
  }, []);

  const [debouncedPeopleSearch, setDebouncedPeopleSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPeopleSearch(peopleSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [peopleSearch]);

  const currUser = useQuery(api.auth.getCurrentUser);

  const searchQueryArgs =
    debouncedPeopleSearch.length >= 2 ? { query: debouncedPeopleSearch } : 'skip';
  const searchUsersResult = useQuery(api.userProfiles.searchUsers, searchQueryArgs);
  const normalizedExactUsername = debouncedPeopleSearch.replace(/^@+/, '').toLowerCase();
  const exactUsernameMatch = useQuery(
    api.userProfiles.getUserProfileByUsername,
    normalizedExactUsername.length >= 3 && /^[a-z0-9_]+$/.test(normalizedExactUsername)
      ? { username: normalizedExactUsername }
      : 'skip'
  );

  const searchResults = useMemo((): PeopleSearchResult[] => {
    if (debouncedPeopleSearch.length < 2) return [];
    const base = searchUsersResult ?? [];
    if (!exactUsernameMatch || exactUsernameMatch === null) return base;
    if (currUser && exactUsernameMatch.userId === currUser._id) return base;
    const exact: PeopleSearchResult = {
      userId: exactUsernameMatch.userId,
      name: exactUsernameMatch.name ?? null,
      username: exactUsernameMatch.username ?? null,
      imageUrl: exactUsernameMatch.imageUrl ?? null,
    };
    const rest = base.filter((u) => u.userId !== exact.userId);
    return [exact, ...rest];
  }, [debouncedPeopleSearch, searchUsersResult, exactUsernameMatch, currUser]);

  const searchLoading =
    debouncedPeopleSearch.length >= 2 &&
    (searchUsersResult === undefined ||
      (normalizedExactUsername.length >= 3 &&
        /^[a-z0-9_]+$/.test(normalizedExactUsername) &&
        exactUsernameMatch === undefined));
  const recommendedPeople = useQuery(api.follows.getPeopleYouMayKnow);
  const activeTabKey = tabs[index]?.key ?? 'people';

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView
          className="bg-background relative flex-1"
          style={{ flex: 1 }}
          edges={['top', 'left', 'right']}>
          <DecorativeGradientShapes />

          <View className="border-border z-10 flex-row border-b">
            {tabs.map((tab, tabIndex) => {
              const isActive = tabIndex === index;
              return (
                <Pressable
                  key={tab.key}
                  className="flex-1 items-center pt-3.5 pb-2"
                  onPress={() => setIndex(tabIndex)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}>
                  <Text
                    className={cn(
                      'text-base font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                    {tab.title}
                  </Text>
                  <View
                    className={cn(
                      'mt-2 h-0.5 w-2/3 rounded-full',
                      isActive ? 'bg-primary' : 'bg-transparent'
                    )}
                  />
                </Pressable>
              );
            })}
          </View>

          {activeTabKey === 'people' ? (
            <PeopleSearchRoute
              peopleSearch={peopleSearch}
              setPeopleSearch={setPeopleSearch}
              searchResults={searchResults}
              searchLoading={searchLoading}
              currUser={currUser}
              currUserId={currUser?._id ?? null}
              recommendedPeople={recommendedPeople}
            />
          ) : (
            <MuseumsRoute
              museumSearch={museumSearch}
              setMuseumSearch={setMuseumSearch}
              museums={museums}
              pagedMuseums={pagedMuseums}
              filteredMuseums={filteredMuseums}
              museumPage={currentMuseumPage}
              totalMuseumPages={totalMuseumPages}
              onPrevPage={() => setMuseumPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setMuseumPage((p) => Math.min(totalMuseumPages, p + 1))}
              sortedByDistance={locState.status === 'ok'}
              expectDistanceOnCards={locState.status === 'ok'}
              locationNote={locState.status === 'unavailable' ? locState.message : null}
              onRetryLocation={retry}
              viewMode={viewMode}
              onToggleViewMode={() => setViewMode((mode) => (mode === 'list' ? 'map' : 'list'))}
              onRequestMuseum={() => setMuseumRequestModalVisible(true)}
              museumRequestSubmitted={museumRequestSubmitted}
            />
          )}
        </SafeAreaView>
      </TouchableWithoutFeedback>
      <MuseumRequestModal
        visible={museumRequestModalVisible}
        initialMuseumName={museumSearch.trim()}
        onClose={() => setMuseumRequestModalVisible(false)}
        onSubmit={handleSubmitMuseumRequest}
      />
    </>
  );
}
