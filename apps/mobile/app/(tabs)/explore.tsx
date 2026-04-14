
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchIcon } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MuseumCard, MuseumCardData } from '../../components/museum-card';
import { CheckinPost, CheckinPostData } from '../../components/checkin-post';
import { router, useLocalSearchParams } from 'expo-router';

const MUSEUMS_PER_PAGE = 10;


// --- Tab Scenes defined outside main component for stability ---
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
  styles,
}: any) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search museums..."
          value={museumSearch}
          onChangeText={setMuseumSearch}
          placeholderTextColor="#C7C7CC"
        />
      </View>
      {museums === undefined ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4915A" />
          <Text style={styles.loadingText}>Loading museums...</Text>
        </View>
      ) : (
        <FlatList
          data={pagedMuseums}
          renderItem={({ item }) => <MuseumCard museum={item as MuseumCardData} />}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
          ListFooterComponent={
            filteredMuseums.length > 0 ? (
              <View style={styles.paginationContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.pageButton,
                    museumPage <= 1 && styles.pageButtonDisabled,
                    pressed && museumPage > 1 && styles.pageButtonPressed,
                  ]}
                  onPress={onPrevPage}
                  disabled={museumPage <= 1}
                >
                  <Text style={styles.pageButtonText}>Previous</Text>
                </Pressable>
                <Text style={styles.pageIndicatorText}>
                  Page {museumPage} of {totalMuseumPages}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.pageButton,
                    museumPage >= totalMuseumPages && styles.pageButtonDisabled,
                    pressed && museumPage < totalMuseumPages && styles.pageButtonPressed,
                  ]}
                  onPress={onNextPage}
                  disabled={museumPage >= totalMuseumPages}
                >
                  <Text style={styles.pageButtonText}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No museums match your search</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// --- Taste Aligned: posts from taste-aligned users + search for a specific person (one tab) ---
function TasteAlignedRoute({
  peopleSearch,
  setPeopleSearch,
  users,
  filteredUsers,
  compatibleCheckins,
  styles,
  currUser,
  currUserId,
}: {
  peopleSearch: string;
  setPeopleSearch: (v: string) => void;
  users: any;
  filteredUsers: any[];
  compatibleCheckins: CheckinPostData[] | undefined;
  styles: any;
  currUser: any;
  currUserId: string | null;
}) {
  const isSearching = peopleSearch.trim().length > 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a person..."
          value={peopleSearch}
          onChangeText={setPeopleSearch}
          placeholderTextColor="#C7C7CC"
        />
      </View>
      {isSearching ? (
        // Person search results
        users === undefined ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4915A" />
            <Text style={styles.loadingText}>Loading people...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={({ item }) => {
              if (currUser && item.userId === currUser._id) return null;
              const rawName = item.name || item.email || '';
              const displayName = typeof rawName === 'string' ? rawName.replace(/\s+\d+$/, '').trim() : '';
              return (
                <Pressable
                  style={styles.userCard}
                  onPress={() => router.push(`/(tabs)/profile?userId=${encodeURIComponent(item.userId)}&search=${encodeURIComponent(peopleSearch)}`)}
                >
                  <Text style={styles.userName} numberOfLines={1}>{displayName || "Name can't be displayed"}</Text>
                </Pressable>
              );
            }}
            keyExtractor={(item) => item.userId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No people match your search</Text>
              </View>
            }
          />
        )
      ) : (
        // Taste-aligned posts when not searching
        compatibleCheckins === undefined ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4915A" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : compatibleCheckins.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
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
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
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

  // People tab state (restore from URL when returning from profile)
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

  // Museums tab state
  const [museumSearch, setMuseumSearch] = useState('');
  const [museumPage, setMuseumPage] = useState(1);
  const museums = useQuery(api.museums.listMuseumsWithStats);
  const filteredMuseums = useMemo(() => {
    if (!museums) return [];
    if (!museumSearch.trim()) return museums;
    const lowerSearch = museumSearch.toLowerCase();
    return museums.filter((museum) =>
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
    if (!peopleSearch.trim()) return []; // Only show accounts when user has searched
    const lowerSearch = peopleSearch.toLowerCase();
    return users.filter((user: any) =>
      user.name?.toLowerCase().includes(lowerSearch) ||
      user.email?.toLowerCase().includes(lowerSearch)
    );
  }, [users, peopleSearch]);

  const currUser = useQuery(api.auth.getCurrentUser);
  const compatibleCheckins = useQuery(api.wrapped.getCompatibleCheckIns);
  const activeTabKey = tabs[index]?.key ?? 'aligned';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top right bubble gradient */}
      <View style={styles.topRightBubble} pointerEvents="none">
        <LinearGradient
          colors={['rgba(230, 210, 255, 0.4)', 'rgba(230, 210, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
          style={styles.bubbleGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      
      {/* Bottom left bubble gradient */}
      <View style={styles.bottomLeftBubble} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(230, 210, 255, 0.1)', 'rgba(230, 210, 255, 0.4)']}
          style={styles.bubbleGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      
      <View style={styles.tabBar}>
        {tabs.map((tab, tabIndex) => {
          const isActive = tabIndex === index;
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setIndex(tabIndex)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {tab.title}
              </Text>
              <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
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
          styles={styles}
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
          styles={styles}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topRightBubble: {
    position: 'absolute',
    top: -200,
    right: -150,
    width: 550,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  bottomLeftBubble: {
    position: 'absolute',
    bottom: -200,
    left: -150,
    width: 550,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1A1A1A',
  },
  tabLabelInactive: {
    color: '#999999',
  },
  tabIndicator: {
    marginTop: 8,
    height: 2,
    width: '70%',
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#D4915A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  listContainer: {
    paddingBottom: 80,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 24,
  },
  pageButton: {
    backgroundColor: '#D4915A',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pageButtonPressed: {
    opacity: 0.85,
  },
  pageButtonDisabled: {
    backgroundColor: '#DDD',
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pageIndicatorText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 48,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
