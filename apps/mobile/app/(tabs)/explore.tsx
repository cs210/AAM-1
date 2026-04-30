import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, type MuseumCardData } from '../../components/museum-card';
import { CheckinPost, type CheckinPostData } from '../../components/checkin-post';
import { SearchFieldRow } from '../../components/search-field-row';
import { PaginationPill } from '../../components/pagination-pill';
import { DecorativeGradientShapes } from '@/components/decorative-gradient-shapes';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';

const MUSEUMS_PER_PAGE = 10;
const LIST_PADDING_BOTTOM = { paddingBottom: 80 } as const;
const FEED_LIST_PADDING = { paddingBottom: 80, paddingHorizontal: 20 } as const;

async function fetchViewerCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24,
    requiredAccuracy: 100_000,
  });
  if (lastKnown?.coords) {
    return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message = 'LOCATION_TIMEOUT'): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

function formatLocationFailure(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (raw === 'LOCATION_TIMEOUT' || lower.includes('location_timeout')) {
    return 'Location is taking too long. Try again, or move near a window.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Location timed out. Try again, or move outdoors for a better GPS signal.';
  }
  if (lower.includes('locationunknown') || lower.includes('location unknown')) {
    return 'No position yet. On the iOS Simulator, set Features -> Location to a real place (not "None"). On a device, try again in a few seconds.';
  }
  if (lower.includes('denied') || lower.includes('permission')) {
    return 'Location access is off. Enable it in Settings to see miles away and sort by distance.';
  }
  return 'Could not read your location. Try again, open Settings, or on Simulator set Features -> Location.';
}

async function fetchViewerCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24,
    requiredAccuracy: 100_000,
  });
  if (lastKnown?.coords) {
    return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message = 'LOCATION_TIMEOUT'): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

function formatLocationFailure(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (raw === 'LOCATION_TIMEOUT' || lower.includes('location_timeout')) {
    return 'Location is taking too long. Try again, or move near a window.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Location timed out. Try again, or move outdoors for a better GPS signal.';
  }
  if (lower.includes('locationunknown') || lower.includes('location unknown')) {
    return 'No position yet. On the iOS Simulator, set Features -> Location to a real place (not "None"). On a device, try again in a few seconds.';
  }
  if (lower.includes('denied') || lower.includes('permission')) {
    return 'Location access is off. Enable it in Settings to see miles away and sort by distance.';
  }
  return 'Could not read your location. Try again, open Settings, or on Simulator set Features -> Location.';
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
}) {
  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <SearchFieldRow
        value={museumSearch}
        onChangeText={setMuseumSearch}
        placeholder="Search museums..."
      />
      {sortedByDistance ? (
        <Text className="mx-5 mb-2 mt-[-2px] text-xs text-muted-foreground" accessibilityLiveRegion="polite">
          Nearest first - distances in miles from you
        </Text>
      ) : locationNote ? (
        <View className="mx-5 mb-3 mt-[-2px] rounded-xl border border-border bg-muted/30 p-3">
          <Text className="text-sm leading-5 text-muted-foreground">{locationNote}</Text>
          <View className="mt-2.5 flex-row flex-wrap gap-2.5">
            <Pressable
              onPress={onRetryLocation}
              className="rounded-lg bg-primary px-3 py-1.5 active:opacity-90">
              <Text className="text-xs font-semibold text-primary-foreground">Try again</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openSettings()}
              className="rounded-lg border border-border bg-card px-3 py-1.5 active:opacity-90">
              <Text className="text-xs font-semibold text-foreground">Open Settings</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {museums === undefined ? (
        <View className="flex-1 items-center justify-center" style={{ flex: 1 }}>
          <BrandActivityIndicator size="large" />
          <Text variant="muted" className="mt-3 text-base">
            Loading museums...
          </Text>
        </View>
      ) : (
        <FlatList
          data={pagedMuseums}
          renderItem={({ item }) => <MuseumCard museum={item} expectDistance={expectDistanceOnCards} />}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={LIST_PADDING_BOTTOM}
          scrollEnabled
          ListFooterComponent={
            filteredMuseums.length > 0 ? (
              <View className="mb-6 mt-2.5 flex-row items-center justify-center gap-2.5">
                <PaginationPill label="Previous" onPress={onPrevPage} disabled={museumPage <= 1} />
                <Text className="text-sm font-medium text-muted-foreground">
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
              <Text className="text-center text-base text-muted-foreground">
                No museums match your search
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function TasteAlignedRoute({
  peopleSearch,
  setPeopleSearch,
  users,
  filteredUsers,
  compatibleCheckins,
  currUser,
  currUserId,
}: {
  peopleSearch: string;
  setPeopleSearch: (v: string) => void;
  users: ReturnType<typeof useQuery<typeof api.auth.listUsers>>;
  filteredUsers: { userId: string; name?: string | null; email?: string | null }[];
  compatibleCheckins: CheckinPostData[] | undefined;
  currUser: { _id: string } | null | undefined;
  currUserId: string | null;
}) {
  const isSearching = peopleSearch.trim().length > 0;

  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <SearchFieldRow
        value={peopleSearch}
        onChangeText={setPeopleSearch}
        placeholder="Search for a person..."
      />
      {isSearching ? (
        users === undefined ? (
          <View className="flex-1 items-center justify-center" style={{ flex: 1 }}>
            <BrandActivityIndicator size="large" />
            <Text variant="muted" className="mt-3 text-base">
              Loading people...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={({ item }) => {
              if (currUser && item.userId === currUser._id) return null;
              const rawName = item.name || item.email || '';
              const displayName =
                typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
              return (
                <Pressable
                  className="mx-5 mb-3 rounded-xl border border-border bg-card p-5 active:opacity-90"
                  onPress={() =>
                    router.push(
                      `/(tabs)/profile?userId=${encodeURIComponent(item.userId)}&search=${encodeURIComponent(peopleSearch)}`
                    )
                  }>
                  <Text className="text-lg font-medium text-foreground" numberOfLines={1}>
                    {displayName || "Name can't be displayed"}
                  </Text>
                </Pressable>
              );
            }}
            keyExtractor={(item) => item.userId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={LIST_PADDING_BOTTOM}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View className="items-center px-12 py-12">
                <Text className="text-center text-base text-muted-foreground">
                  No people match your search
                </Text>
              </View>
            }
          />
        )
      ) : compatibleCheckins === undefined ? (
        <View className="flex-1 items-center justify-center" style={{ flex: 1 }}>
          <BrandActivityIndicator size="large" />
          <Text variant="muted" className="mt-3 text-base">
            Loading...
          </Text>
        </View>
      ) : compatibleCheckins.length === 0 ? (
        <View className="items-center px-12 py-12">
          <Text className="text-center text-base text-muted-foreground">
            Follow museums to get a taste profile. Posts from taste-aligned people will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={compatibleCheckins}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <CheckinPost
              checkin={item}
              cardIndex={index}
              isOwnCheckin={currUserId != null && item.userId === currUserId}
              openOnReviewsTab
            />
          )}
          contentContainerStyle={FEED_LIST_PADDING}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ search?: string | string[]; tab?: string | string[] }>();
  const [index, setIndex] = useState(0);
  const tabs = React.useMemo(
    () => [
      { key: 'aligned', title: 'Taste Aligned' },
      { key: 'museums', title: 'Museums' },
    ],
    []
  );

  const [peopleSearch, setPeopleSearch] = useState('');
  useEffect(() => {
    const searchParam = Array.isArray(params.search) ? params.search[0] : params.search;
    const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (typeof searchParam === 'string' && searchParam !== '') {
      setPeopleSearch(searchParam);
    }
    if (tabParam === 'museums') {
      setIndex(1);
    } else if (tabParam === 'aligned' || tabParam === 'people') {
      setIndex(0);
    }
  }, [params.search, params.tab]);

  const [museumSearch, setMuseumSearch] = useState('');
  const [museumPage, setMuseumPage] = useState(1);

  type LocState =
    | { status: 'pending' }
    | { status: 'ok'; viewer: { latitude: number; longitude: number } }
    | { status: 'unavailable'; message: string };
  const [locState, setLocState] = useState<LocState>({ status: 'pending' });
  const [locationRetryKey, setLocationRetryKey] = useState(0);

  const resolveLocation = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocState({
          status: 'unavailable',
          message: 'Location Services are off. Turn them on to see distance and sort museums nearest first.',
        });
        return;
      }

      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted') {
        setLocState({
          status: 'unavailable',
          message: 'Location access is off. Enable it to see miles away and sort by distance.',
        });
        return;
      }

      const viewer = await withTimeout(fetchViewerCoordinates(), 25_000);
      setLocState({ status: 'ok', viewer });
    } catch (err) {
      setLocState({
        status: 'unavailable',
        message: formatLocationFailure(err),
      });
    }
  }, []);

  useEffect(() => {
    void resolveLocation();
  }, [locationRetryKey, resolveLocation]);

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

  const users = useQuery(api.auth.listUsers);
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!peopleSearch.trim()) return [];
    const lowerSearch = peopleSearch.toLowerCase();
    return users.filter(
      (user: { name?: string | null; email?: string | null }) =>
        user.name?.toLowerCase().includes(lowerSearch) ||
        user.email?.toLowerCase().includes(lowerSearch)
    );
  }, [users, peopleSearch]);

  const currUser = useQuery(api.auth.getCurrentUser);
  const compatibleCheckins = useQuery(api.wrapped.getCompatibleCheckIns);
  const activeTabKey = tabs[index]?.key ?? 'aligned';

  return (
    <SafeAreaView
      className="relative flex-1 bg-background"
      style={{ flex: 1 }}
      edges={['top', 'left', 'right']}>
      <DecorativeGradientShapes />

      <View className="z-10 flex-row border-b border-border">
        {tabs.map((tab, tabIndex) => {
          const isActive = tabIndex === index;
          return (
            <Pressable
              key={tab.key}
              className="flex-1 items-center pb-2 pt-3.5"
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

      {activeTabKey === 'aligned' ? (
        <TasteAlignedRoute
          peopleSearch={peopleSearch}
          setPeopleSearch={setPeopleSearch}
          users={users}
          filteredUsers={filteredUsers}
          compatibleCheckins={compatibleCheckins}
          currUser={currUser}
          currUserId={currUser?._id ?? null}
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
          onRetryLocation={() => setLocationRetryKey((k) => k + 1)}
        />
      )}
    </SafeAreaView>
  );
}
