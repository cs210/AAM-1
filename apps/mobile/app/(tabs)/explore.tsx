import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, MuseumCardData } from '../../components/museum-card';
import { CheckinPost, CheckinPostData } from '../../components/checkin-post';
import { SearchFieldRow } from '../../components/search-field-row';
import { PaginationPill } from '../../components/pagination-pill';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import { cn } from '@/lib/utils';

const MUSEUMS_PER_PAGE = 10;

const LIST_PADDING_BOTTOM = { paddingBottom: 80 } as const;

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
}) {
  return (
    <View className="flex-1" style={{ flex: 1 }}>
      <SearchFieldRow
        value={museumSearch}
        onChangeText={setMuseumSearch}
        placeholder="Search museums..."
      />
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
          renderItem={({ item }) => <MuseumCard museum={item as MuseumCardData} />}
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
          contentContainerStyle={LIST_PADDING_BOTTOM}
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
  React.useEffect(() => {
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
  const museums = useQuery(api.museums.listMuseumsWithStats);
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
  React.useEffect(() => {
    setMuseumPage(1);
  }, [museumSearch]);
  React.useEffect(() => {
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
      <View
        className="absolute -right-38 -top-50 z-0 h-100 w-137.5 overflow-hidden rounded-full"
        pointerEvents="none">
        <LinearGradient
          colors={['rgba(230, 210, 255, 0.4)', 'rgba(230, 210, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
          style={{ width: '100%', height: '100%' }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <View
        className="absolute -bottom-50 -left-38 z-0 h-100 w-137.5 overflow-hidden rounded-full"
        pointerEvents="none">
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(230, 210, 255, 0.1)', 'rgba(230, 210, 255, 0.4)']}
          style={{ width: '100%', height: '100%' }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <View className="z-10 flex-row border-b border-border bg-background">
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
        />
      )}
    </SafeAreaView>
  );
}
