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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { MapPin, List } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, type MuseumCardData } from '../../components/museum-card';
import { MuseumMapView } from '../../components/museum-map-view';
import { SoftwareFairMapView } from '@/components/software-fair-map-view';
import { CheckinPost, type CheckinPostData } from '../../components/checkin-post';
import { SearchFieldRow } from '../../components/search-field-row';
import { PaginationPill } from '../../components/pagination-pill';
import { DecorativeGradientShapes } from '@/components/decorative-gradient-shapes';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLastExploreTabIndex, setLastExploreTabIndex } from '@/lib/last-people-search';
import { userProfileHref } from '@/lib/user-profile-navigation';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import { useSoftwareFairMode } from '@/lib/software-fair-mode';
import { SOFTWARE_FAIR_GENRE_COLORS } from '@/lib/software-fair-map-layout';
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
const SOFTWARE_FAIR_GENRE_ORDER = Object.keys(SOFTWARE_FAIR_GENRE_COLORS);

function normalizeGenre(value: string) {
  return value.trim();
}

function boothHasGenre(museum: MuseumCardData, selectedGenre: string | null) {
  if (!selectedGenre) return true;
  const booth = museum.softwareFairBooth;
  if (!booth) return false;
  const normalizedSelected = normalizeGenre(selectedGenre).toLowerCase();
  return booth.genres.some((genre) => normalizeGenre(genre).toLowerCase() === normalizedSelected);
}

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return `rgba(0,0,0,${alpha})`;
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function splitGenresIntoRows(genres: string[]) {
  const midpoint = Math.ceil(genres.length / 2);
  return [genres.slice(0, midpoint), genres.slice(midpoint)].filter((row) => row.length > 0);
}

function SoftwareFairGenreFilter({
  genres,
  selectedGenre,
  onSelectGenre,
}: {
  genres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
}) {
  if (genres.length === 0) return null;
  const genreRows = splitGenresIntoRows(genres);

  return (
    <View className="border-border/70 bg-card/70 mx-5 mb-2 rounded-2xl border p-2.5 shadow-sm shadow-black/5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingRight: 4 }}>
        <View className="gap-1.5">
          {genreRows.map((rowGenres, rowIndex) => (
            <View key={`genre-row-${rowIndex}`} className="flex-row gap-2">
              {rowGenres.map((genre) => {
                const color = SOFTWARE_FAIR_GENRE_COLORS[genre] ?? SOFTWARE_FAIR_GENRE_COLORS.Other;
                const isSelected = selectedGenre === genre;
                return (
                  <Pressable
                    key={genre}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${isSelected ? 'Clear' : 'Filter by'} ${genre}`}
                    onPress={() => onSelectGenre(isSelected ? null : genre)}
                    className={cn(
                      'flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1.5 active:opacity-80',
                      isSelected ? 'border-transparent' : 'border-border bg-background/70'
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundColor: hexToRgba(color, 0.22),
                            borderColor: hexToRgba(color, 0.45),
                          }
                        : undefined
                    }>
                    <View className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        isSelected ? 'text-foreground' : 'text-muted-foreground'
                      )}
                      numberOfLines={1}>
                      {genre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MuseumsRoute({
  museumSearch,
  setMuseumSearch,
  museums,
  pagedMuseums,
  filteredMuseums,
  mapMuseums,
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
  isSoftwareFairMode,
  genreOptions,
  selectedGenre,
  onSelectGenre,
}: {
  museumSearch: string;
  setMuseumSearch: (v: string) => void;
  museums: MuseumCardData[] | undefined;
  pagedMuseums: MuseumCardData[];
  filteredMuseums: MuseumCardData[];
  mapMuseums: MuseumCardData[];
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
  isSoftwareFairMode: boolean;
  genreOptions: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
}) {
  const noun = isSoftwareFairMode ? 'booths' : 'museums';

  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <View className="flex-row items-center gap-2 px-5 py-3">
        <View className="flex-1">
          <SearchFieldRow
            value={museumSearch}
            onChangeText={setMuseumSearch}
            placeholder={isSoftwareFairMode ? 'Search booths, teams...' : 'Search museums...'}
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
      {isSoftwareFairMode ? (
        <SoftwareFairGenreFilter
          genres={genreOptions}
          selectedGenre={selectedGenre}
          onSelectGenre={onSelectGenre}
        />
      ) : null}
      {sortedByDistance ? (
        <Text
          className="text-muted-foreground mx-5 mt-[-2px] mb-2 text-xs"
          accessibilityLiveRegion="polite">
          Nearest {noun} first - distances in miles from you
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

      {viewMode === 'map' && isSoftwareFairMode ? (
        <SoftwareFairMapView
          booths={mapMuseums}
          isLoading={museums === undefined}
          selectedGenre={selectedGenre}
        />
      ) : viewMode === 'map' ? (
        <MuseumMapView museums={filteredMuseums} isLoading={museums === undefined} />
      ) : museums === undefined ? (
        <View className="flex-1 items-center justify-center" style={{ flex: 1 }}>
          <BrandActivityIndicator size="large" />
          <Text variant="muted" className="mt-3 text-base">
            Loading {noun}...
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
            <View className="items-center px-12 py-12">
              <Text className="text-muted-foreground text-center text-base">
                No {noun} match your {selectedGenre ? 'filters' : 'search'}
              </Text>
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
  const softwareFair = useSoftwareFairMode();
  const isSoftwareFairMode = softwareFair.isJoined;
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const tabs = React.useMemo(
    () => [
      { key: 'people', title: 'People' },
      { key: 'museums', title: isSoftwareFairMode ? 'Booths' : 'Museums' },
    ],
    [isSoftwareFairMode]
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
  const [museumPage, setMuseumPage] = useState(1);
  const [selectedSoftwareFairGenre, setSelectedSoftwareFairGenre] = useState<string | null>(null);
  const shouldResolveViewerLocation = !isSoftwareFairMode || viewMode !== 'map';
  const { locState, retry } = useViewerLocation({ enabled: shouldResolveViewerLocation });
  const viewerArg =
    shouldResolveViewerLocation && locState.status === 'ok' ? locState.viewer : undefined;

  const museums = useQuery(
    api.museums.listMuseumsWithStats,
    !isSoftwareFairMode ? (viewerArg ? { viewer: viewerArg } : {}) : 'skip'
  );
  const softwareFairMuseums = useQuery(
    api.softwareFair.listActiveBoothMuseums,
    isSoftwareFairMode ? (viewerArg ? { viewer: viewerArg } : {}) : 'skip'
  );
  const activeMuseums = (isSoftwareFairMode ? softwareFairMuseums : museums) as
    | MuseumCardData[]
    | undefined;
  const softwareFairGenreOptions = useMemo(() => {
    if (!isSoftwareFairMode || !activeMuseums) return [];
    const activeGenres = new Set<string>();
    activeMuseums.forEach((museum) => {
      museum.softwareFairBooth?.genres.forEach((genre) => {
        const normalized = normalizeGenre(genre);
        if (normalized) activeGenres.add(normalized);
      });
    });

    const orderedGenres = SOFTWARE_FAIR_GENRE_ORDER.filter((genre) => activeGenres.has(genre));
    const extraGenres = [...activeGenres]
      .filter((genre) => !SOFTWARE_FAIR_GENRE_ORDER.includes(genre))
      .sort((a, b) => a.localeCompare(b));
    return [...orderedGenres, ...extraGenres];
  }, [activeMuseums, isSoftwareFairMode]);

  const searchFilteredMuseums = useMemo(() => {
    if (!activeMuseums) return [];
    if (!museumSearch.trim()) return activeMuseums;
    const lowerSearch = museumSearch.toLowerCase();
    return activeMuseums.filter((museum) => {
      const booth = museum.softwareFairBooth;
      const haystack = [
        museum.name,
        museum.category,
        museum.location?.city,
        museum.location?.state,
        booth?.projectName,
        booth?.boothNumber != null ? String(booth.boothNumber) : undefined,
        booth?.genres.join(' '),
        booth?.teamMembers.join(' '),
        booth?.description ?? undefined,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(lowerSearch);
    });
  }, [activeMuseums, museumSearch]);
  const filteredMuseums = useMemo(() => {
    if (!isSoftwareFairMode || !selectedSoftwareFairGenre) return searchFilteredMuseums;
    return searchFilteredMuseums.filter((museum) =>
      boothHasGenre(museum, selectedSoftwareFairGenre)
    );
  }, [isSoftwareFairMode, searchFilteredMuseums, selectedSoftwareFairGenre]);
  const mapMuseums = isSoftwareFairMode ? searchFilteredMuseums : filteredMuseums;
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
  }, [museumSearch, isSoftwareFairMode, selectedSoftwareFairGenre]);
  useEffect(() => {
    setSelectedSoftwareFairGenre(null);
  }, [isSoftwareFairMode]);
  useEffect(() => {
    if (
      selectedSoftwareFairGenre &&
      !softwareFairGenreOptions.includes(selectedSoftwareFairGenre)
    ) {
      setSelectedSoftwareFairGenre(null);
    }
  }, [selectedSoftwareFairGenre, softwareFairGenreOptions]);
  useEffect(() => {
    if (museumPage > totalMuseumPages) {
      setMuseumPage(totalMuseumPages);
    }
  }, [museumPage, totalMuseumPages]);

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
            museums={activeMuseums}
            pagedMuseums={pagedMuseums}
            filteredMuseums={filteredMuseums}
            mapMuseums={mapMuseums}
            museumPage={currentMuseumPage}
            totalMuseumPages={totalMuseumPages}
            onPrevPage={() => setMuseumPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setMuseumPage((p) => Math.min(totalMuseumPages, p + 1))}
            sortedByDistance={
              locState.status === 'ok' && (!isSoftwareFairMode || viewMode !== 'map')
            }
            expectDistanceOnCards={locState.status === 'ok'}
            locationNote={
              !isSoftwareFairMode && locState.status === 'unavailable' ? locState.message : null
            }
            onRetryLocation={retry}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode((mode) => (mode === 'list' ? 'map' : 'list'))}
            isSoftwareFairMode={isSoftwareFairMode}
            genreOptions={softwareFairGenreOptions}
            selectedGenre={selectedSoftwareFairGenre}
            onSelectGenre={setSelectedSoftwareFairGenre}
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
